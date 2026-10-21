'use client'

import { useDocumentInfo, useFormModified } from '@payloadcms/ui'
import Link from 'next/link'
import { useCallback, useEffect, useId, useState } from 'react'

import { stageOf, type ApplicationLike, type Stage } from '../../membership/stage'
import {
  apiError,
  apiJson,
  fill,
  Notice,
  StepUpDialog,
  StepUpSection,
  useAdminText,
} from '../client'
import { formatDate, type adminTexts, type AdminLanguage } from '../i18n'
import { Icon } from '../icons'

type Texts = (typeof adminTexts)['de']

type CaseEvent = {
  id: number
  event: string
  from?: string | null
  to?: string | null
  actorName?: string | null
  createdAt: string
  detail?: { fields?: string[] } | null
}

const STATUS_VALUES = new Set(['received', 'inReview', 'accepted', 'rejected'])
const DATE_EVENTS = new Set(['application.consent', 'application.followUp', 'member.ended'])

function eventText(event: CaseEvent, t: Texts, lang: AdminLanguage) {
  const value = (raw: string | null | undefined) => {
    if (!raw) return t.removed
    if (STATUS_VALUES.has(raw)) return t[`stage_${raw}` as keyof Texts]
    if (DATE_EVENTS.has(event.event)) return formatDate(raw, lang)
    if (event.event === 'member.reviewed') return t[`review_${raw}` as keyof Texts] ?? raw
    return raw
  }
  const template = t[`ev_${event.event}` as keyof Texts] ?? event.event
  const fields = (event.detail?.fields ?? [])
    .map((field) => t[`field_${field}` as keyof Texts] ?? field)
    .join(', ')
  let text = fill(template, { from: value(event.from), to: value(event.to), fields })
  if (event.event === 'member.created') {
    text += ` (${event.to === 'application' ? t.sourceApplication : t.sourceManual})`
  }
  return text
}

function History({
  events,
  t,
  lang,
}: {
  events: CaseEvent[] | null
  t: Texts
  lang: AdminLanguage
}) {
  return (
    <div className="yop-case__history">
      <h3 className="yop-case__subtitle">{t.historyTitle}</h3>
      {events == null ? null : events.length ? (
        <ol className="yop-timeline yop-timeline--compact">
          {events.map((event) => (
            <li key={event.id}>
              <span className="yop-timeline__title">{eventText(event, t, lang)}</span>
              <span className="yop-list__meta">
                <bdi>{event.actorName || t.cellSystem}</bdi> ·{' '}
                <bdi>{formatDate(event.createdAt, lang)}</bdi>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="yop-hint">{t.historyEmpty}</p>
      )}
    </div>
  )
}

function useCaseData<T>(load: () => Promise<T>, id: unknown) {
  const [data, setData] = useState<T | null>(null)
  const refresh = useCallback(() => {
    if (id) void load().then(setData)
  }, [id, load])
  useEffect(() => refresh(), [refresh])
  return data
}

type ApplicationDoc = ApplicationLike & {
  id: number
  status?: string
  personalDataMovedOn?: string | null
}

/**
 * Sidebar of a membership application: where it stands, the next steps as buttons (start the
 * review, accept, reject, reopen), the link to the register entry once accepted, and the case
 * history. The rules (consent before acceptance, no change after the register entry) are
 * checked on the server; the buttons only make the next step obvious.
 */
export function ApplicationPanel() {
  const { t, lang } = useAdminText()
  const { id, docPermissions } = useDocumentInfo()
  const modified = useFormModified()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [doc, events, member] = await Promise.all([
      apiJson<ApplicationDoc>(`/membership-applications/${id}?depth=0`),
      apiJson<{ docs: CaseEvent[] }>(
        `/case-events?where[application][equals]=${id}&sort=-createdAt&limit=50&depth=0`,
      ),
      apiJson<{ docs: { id: number }[] }>(
        `/members?where[application][equals]=${id}&limit=1&depth=0`,
      ),
    ])
    return {
      doc: doc.status === 200 ? doc.data : null,
      events: events.status === 200 ? events.data.docs : [],
      memberId: member.status === 200 ? (member.data.docs[0]?.id ?? null) : null,
    }
  }, [id])
  const data = useCaseData(load, id)
  if (!id) return null

  const doc = data?.doc
  const stage: Stage | null = doc ? stageOf(doc) : null
  const canUpdate = Boolean(docPermissions?.update)

  async function setStatus(status: string, question?: string) {
    if (question && !window.confirm(question)) return
    setBusy(true)
    setError(null)
    const result = await apiJson(`/membership-applications/${id}`, {
      method: 'PATCH',
      body: { status },
    })
    if (result.status === 200) {
      window.location.reload()
      return
    }
    setBusy(false)
    setError(fill(t.actionFailed, { message: apiError(result.data) ?? String(result.status) }))
  }

  const actions: {
    key: string
    label: string
    status: string
    question?: string
    primary?: boolean
  }[] =
    !stage || !canUpdate
      ? []
      : stage === 'received'
        ? [{ key: 'review', label: t.actionStartReview, status: 'inReview', primary: true }]
        : stage === 'inReview'
          ? [
              {
                key: 'accept',
                label: t.actionAccept,
                status: 'accepted',
                question: t.confirmAccept,
                primary: true,
              },
              {
                key: 'reject',
                label: t.actionReject,
                status: 'rejected',
                question: t.confirmReject,
              },
            ]
          : stage === 'consentPending'
            ? [
                {
                  key: 'reject',
                  label: t.actionReject,
                  status: 'rejected',
                  question: t.confirmReject,
                },
              ]
            : stage === 'rejected'
              ? [{ key: 'reopen', label: t.actionReopen, status: 'inReview' }]
              : []

  return (
    <section className="yop-case" aria-labelledby="yop-case-title">
      <h3 id="yop-case-title" className="yop-case__title">
        <Icon name="apps" />
        {t.caseTitle}
      </h3>
      {stage && (
        <p className="yop-case__stage">
          <span className="yop-hint">{t.currentStage}</span>
          <span
            className={`yop-pill yop-pill--${stage === 'consentPending' ? 'warning' : stage === 'accepted' ? 'good' : 'info'}`}
          >
            {t[`stage_${stage}` as keyof Texts]}
          </span>
        </p>
      )}
      {stage === 'consentPending' && <Notice tone="warning">{t.consentNeeded}</Notice>}
      {doc?.personalDataMovedOn && <p className="yop-hint">{t.movedHint}</p>}
      {data?.memberId ? (
        <div className="yop-case__link">
          <p className="yop-hint">{t.lockedAfterAdmission}</p>
          <Link
            className="yop-button yop-button--small yop-button--block"
            href={`/admin/collections/members/${data.memberId}`}
            prefetch={false}
          >
            <Icon name="register" />
            {t.memberRecord}: {t.openRecord}
          </Link>
        </div>
      ) : null}
      {actions.length > 0 && (
        <div className="yop-case__actions">
          {modified && <p className="yop-hint">{t.saveFirst}</p>}
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              className={`yop-button yop-button--small yop-button--block${action.primary ? ' yop-button--primary' : ''}`}
              disabled={busy || modified}
              onClick={() => void setStatus(action.status, action.question)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      {error && (
        <Notice tone="error" live>
          {error}
        </Notice>
      )}
      <History events={data ? data.events : null} t={t} lang={lang} />
    </section>
  )
}

type MemberDoc = {
  id: number
  status?: string
  application?: number | { id: number } | null
  reviewDueOn?: string | null
  reviewOutcome?: 'pending' | 'retainedAll' | 'retainedMinimal' | null
  retainUntil?: string | null
  retentionReason?: string | null
  reviewedOn?: string | null
  reviewedByName?: string | null
  contactDataRemovedOn?: string | null
}

const REASONS = ['legal', 'accounting', 'proof', 'other'] as const
const inAYear = () => {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().slice(0, 10)
}

/**
 * The review after the membership ended: keep everything or only the minimal record until a
 * date, with the reason. Removing the contact data needs a fresh code; the server checks the
 * rules and records the decision.
 */
function ReviewSection({ doc, canEdit }: { doc: MemberDoc; canEdit: boolean }) {
  const { t, lang } = useAdminText()
  const fieldId = useId()
  const minimal = Boolean(doc.contactDataRemovedOn)
  const [keep, setKeep] = useState<'all' | 'minimal'>(minimal ? 'minimal' : 'all')
  const [until, setUntil] = useState(inAYear)
  const [reason, setReason] = useState<(typeof REASONS)[number]>('proof')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [stepUp, setStepUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The moment the panel opened: whether the review date has come.
  const [openedAt] = useState(() => Date.now())
  const due = !doc.reviewDueOn || new Date(doc.reviewDueOn).getTime() <= openedAt
  const decided = doc.reviewOutcome && doc.reviewOutcome !== 'pending'

  async function save(confirmed = false) {
    if (keep === 'minimal' && !minimal && !confirmed && !window.confirm(t.confirmReduce)) return
    setBusy(true)
    setError(null)
    const result = await apiJson<{ error?: string }>(`/members/${doc.id}/review`, {
      method: 'POST',
      body: { keep, until, reason, note },
    })
    setBusy(false)
    if (result.status === 200) {
      window.location.reload()
      return
    }
    if (result.status === 403 && result.data.error === 'step_up_required') {
      setStepUp(true)
      return
    }
    setError(
      (t[`reviewErr_${result.data.error}` as keyof typeof t] as string | undefined) ??
        t.genericError,
    )
  }

  return (
    <div className="yop-review">
      <h4 className="yop-case__subtitle">{t.reviewTitle}</h4>
      <p className="yop-case__stage">
        <span className={`yop-pill ${due ? 'yop-pill--warning' : 'yop-pill--neutral'}`}>
          {due ? t.member_review : t[`review_${doc.reviewOutcome ?? 'pending'}` as keyof typeof t]}
        </span>
        {doc.reviewDueOn && (
          <span className="yop-hint">
            {fill(due ? t.reviewDue : t.reviewNotDue, {
              date: formatDate(doc.reviewDueOn, lang),
            })}
          </span>
        )}
      </p>
      {decided && (
        <p className="yop-hint">
          {fill(t.reviewDone, {
            outcome: t[`review_${doc.reviewOutcome}` as keyof typeof t] as string,
            date: formatDate(doc.retainUntil ?? null, lang),
            reason: t[`reason_${doc.retentionReason}` as keyof typeof t] as string,
            when: formatDate(doc.reviewedOn ?? null, lang),
            name: doc.reviewedByName ?? '—',
          })}
        </p>
      )}
      {minimal && (
        <p className="yop-hint">
          {fill(t.reviewMinimalNote, { date: formatDate(doc.contactDataRemovedOn ?? null, lang) })}
        </p>
      )}
      <p className="yop-hint">{t.reviewLead}</p>
      {canEdit && (
        <div className="yop-review__form">
          <fieldset className="yop-fieldset">
            <legend className="yop-label yop-label--small">{t.reviewKeep}</legend>
            {!minimal && (
              <label className="yop-check">
                <input
                  type="radio"
                  name={`${fieldId}-keep`}
                  checked={keep === 'all'}
                  onChange={() => setKeep('all')}
                />
                <span>{t.reviewKeepAll}</span>
              </label>
            )}
            <label className="yop-check">
              <input
                type="radio"
                name={`${fieldId}-keep`}
                checked={keep === 'minimal'}
                onChange={() => setKeep('minimal')}
              />
              <span>{t.reviewKeepMinimal}</span>
            </label>
          </fieldset>
          <label className="yop-label yop-label--small" htmlFor={`${fieldId}-until`}>
            {t.reviewUntil}
          </label>
          <input
            id={`${fieldId}-until`}
            className="yop-input"
            type="date"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
          />
          <label className="yop-label yop-label--small" htmlFor={`${fieldId}-reason`}>
            {t.reviewReason}
          </label>
          <select
            id={`${fieldId}-reason`}
            className="yop-input yop-select"
            value={reason}
            onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}
          >
            {REASONS.map((value) => (
              <option key={value} value={value}>
                {t[`reason_${value}` as keyof typeof t] as string}
              </option>
            ))}
          </select>
          <label className="yop-label yop-label--small" htmlFor={`${fieldId}-note`}>
            {t.reviewNote}
          </label>
          <input
            id={`${fieldId}-note`}
            className="yop-input"
            maxLength={300}
            value={note}
            aria-describedby={`${fieldId}-note-hint`}
            onChange={(e) => setNote(e.target.value)}
          />
          <p id={`${fieldId}-note-hint`} className="yop-hint">
            {t.reviewNoteHint}
          </p>
          <button
            type="button"
            className="yop-button yop-button--small yop-button--block"
            disabled={busy || !until}
            onClick={() => void save()}
          >
            {t.reviewSave}
          </button>
          <p className="yop-hint">{t.reviewDeleteInstead}</p>
        </div>
      )}
      {error && (
        <Notice tone="error" live>
          {error}
        </Notice>
      )}
      <StepUpDialog
        open={stepUp}
        onClose={() => setStepUp(false)}
        onConfirmed={() => void save(true)}
      />
    </div>
  )
}

/**
 * Sidebar of a register entry: end or reactivate the membership, the link to the application
 * it came from, the code confirmation needed before deleting, and the case history.
 */
export function MemberPanel() {
  const { t, lang } = useAdminText()
  const { id, docPermissions } = useDocumentInfo()
  const modified = useFormModified()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [doc, events] = await Promise.all([
      apiJson<MemberDoc>(`/members/${id}?depth=0`),
      apiJson<{ docs: CaseEvent[] }>(
        `/case-events?where[member][equals]=${id}&sort=-createdAt&limit=50&depth=0`,
      ),
    ])
    return {
      doc: doc.status === 200 ? doc.data : null,
      events: events.status === 200 ? events.data.docs : [],
    }
  }, [id])
  const data = useCaseData(load, id)
  if (!id) return null
  const doc = data?.doc
  const applicationId =
    doc?.application && typeof doc.application === 'object' ? doc.application.id : doc?.application

  async function setStatus(status: 'active' | 'ended') {
    if (status === 'ended' && !window.confirm(t.confirmEnd)) return
    setBusy(true)
    setError(null)
    const result = await apiJson(`/members/${id}`, {
      method: 'PATCH',
      body: status === 'ended' ? { status, endedOn: new Date().toISOString() } : { status },
    })
    if (result.status === 200) {
      window.location.reload()
      return
    }
    setBusy(false)
    setError(fill(t.actionFailed, { message: apiError(result.data) ?? String(result.status) }))
  }

  return (
    <section className="yop-case" aria-labelledby="yop-case-title">
      <h3 id="yop-case-title" className="yop-case__title">
        <Icon name="register" />
        {t.memberRecord}
      </h3>
      {doc && (
        <p className="yop-case__stage">
          <span className="yop-hint">{t.colStatus}</span>
          <span
            className={`yop-pill ${doc.status === 'ended' ? 'yop-pill--neutral' : 'yop-pill--good'}`}
          >
            {doc.status === 'ended' ? t.member_ended : t.member_active}
          </span>
        </p>
      )}
      <p className="yop-hint">{t.retentionMember}</p>
      {applicationId ? (
        <Link
          className="yop-button yop-button--small yop-button--block"
          href={`/admin/collections/membership-applications/${applicationId}`}
          prefetch={false}
        >
          <Icon name="apps" />
          {t.openApplication}
        </Link>
      ) : null}
      {doc && docPermissions?.update && (
        <div className="yop-case__actions">
          {modified && <p className="yop-hint">{t.saveFirst}</p>}
          <button
            type="button"
            className="yop-button yop-button--small yop-button--block"
            disabled={busy || modified}
            onClick={() => void setStatus(doc.status === 'ended' ? 'active' : 'ended')}
          >
            {doc.status === 'ended' ? t.reactivate : t.endMembership}
          </button>
        </div>
      )}
      {error && (
        <Notice tone="error" live>
          {error}
        </Notice>
      )}
      {doc?.status === 'ended' && (
        <ReviewSection doc={doc} canEdit={Boolean(docPermissions?.update) && !modified} />
      )}
      {(docPermissions as { delete?: boolean } | undefined)?.delete && (
        <StepUpSection hint={t.memberDeleteHint} />
      )}
      <History events={data ? data.events : null} t={t} lang={lang} />
    </section>
  )
}
