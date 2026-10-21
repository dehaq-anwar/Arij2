'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'

import type { ExportDataset } from '../../membership/export'
import { fill, Notice, StepUpDialog, useAdminText } from '../client'
import { Icon } from '../icons'

type Column = { key: string; label: string }
export type ExportPurpose = {
  id: number
  dataset: ExportDataset
  name: string
  description: string
  justification: string
  columns: string[]
  decision: string
  approvedOn: string
  basis: { code: string; title: string; article: string; explanation: string }
}
type Props = {
  datasets: ExportDataset[]
  initial: { dataset: ExportDataset; stage: string; status: string; type: string; q: string }
  columns: Record<string, Column[]>
  purposes: ExportPurpose[]
  canManagePurposes: boolean
  draftPurposes: number
  recent: {
    id: number
    when: string
    dataset: ExportDataset
    rows: number
    purpose: string
    purposeName: string
  }[]
  notAllowed: string | null
}

const STAGES = ['all', 'open', 'received', 'inReview', 'consentPending', 'accepted', 'rejected']
const MEMBER_STATUSES = ['active', 'ended', 'review', 'all']

export function ExportClient({
  datasets,
  initial,
  columns,
  purposes,
  canManagePurposes,
  draftPurposes,
  recent,
  notAllowed,
}: Props) {
  const { t } = useAdminText()
  const router = useRouter()
  const id = useId()
  const [dataset, setDataset] = useState<ExportDataset>(initial.dataset)
  const [stage, setStage] = useState(initial.stage)
  const [status, setStatus] = useState(initial.status)
  const [type, setType] = useState(initial.type)
  const [q, setQ] = useState(initial.q)
  const [purposeId, setPurposeId] = useState<number | null>(null)
  const [chosen, setChosen] = useState<string[]>([])
  const [occasion, setOccasion] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [separator, setSeparator] = useState<';' | ','>(';')
  const [busy, setBusy] = useState(false)
  const [stepUp, setStepUp] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  if (notAllowed) {
    return (
      <div className="yop-page">
        <h1>{t.exportTitle}</h1>
        <Notice tone="warning">{notAllowed}</Notice>
      </div>
    )
  }

  const forDataset = purposes.filter((p) => p.dataset === dataset)
  const purpose = forDataset.find((p) => p.id === purposeId) ?? null
  const available = (columns[dataset] ?? []).filter((c) => purpose?.columns.includes(c.key))
  const occasionLength = occasion.replace(/\s+/g, ' ').trim().length
  const ready =
    purpose !== null &&
    chosen.length > 0 &&
    occasionLength >= 10 &&
    occasionLength <= 300 &&
    confirmed

  function choosePurpose(next: ExportPurpose) {
    setPurposeId(next.id)
    // The purpose already limits the columns to what it needs: all of them to start with.
    setChosen(next.columns)
    setConfirmed(false)
  }

  async function run() {
    if (!purpose) return
    setBusy(true)
    setMessage(null)
    const response = await fetch('/api/exports/run', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataset,
        purposeId: purpose.id,
        columns: chosen,
        filter: dataset === 'applications' ? { stage, type, q } : { status, type, q },
        purpose: occasion,
        confirmed,
        separator,
      }),
    })
    if (response.ok) {
      const blob = await response.blob()
      const name =
        /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ??
        'export.csv'
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = name
      document.body.append(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setBusy(false)
      setOccasion('')
      setConfirmed(false)
      setMessage({
        tone: 'success',
        text: fill(t.exportDone, { rows: response.headers.get('X-Export-Rows') ?? '0' }),
      })
      router.refresh()
      return
    }
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    setBusy(false)
    if (response.status === 403 && data.error === 'step_up_required') {
      setStepUp(true)
      return
    }
    const key = `exportErr_${data.error}` as keyof typeof t
    setMessage({ tone: 'error', text: (t[key] as string | undefined) ?? t.genericError })
  }

  const toggle = (key: string) =>
    setChosen((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    )

  return (
    <div className="yop-page yop-export">
      <div className="yop-page__head">
        <div>
          <h1 className="yop-page__title">
            <span className="yop-page__icon">
              <Icon name="download" />
            </span>
            {t.exportTitle}
          </h1>
          <p className="yop-lead">{t.exportLead}</p>
        </div>
      </div>
      <div className="yop-grid yop-grid--main">
        <section className="yop-card" aria-labelledby={`${id}-form`}>
          <h2 id={`${id}-form`} className="yop-visually-hidden">
            {t.exportTitle}
          </h2>
          <div className="yop-form">
            {datasets.length > 1 && (
              <fieldset className="yop-fieldset">
                <legend className="yop-label">{t.exportDataset}</legend>
                <div className="yop-segmented yop-segmented--choices">
                  {datasets.map((d) => (
                    <label key={d} className="yop-choice">
                      <input
                        type="radio"
                        name="dataset"
                        value={d}
                        checked={dataset === d}
                        onChange={() => {
                          setDataset(d)
                          setPurposeId(null)
                          setChosen([])
                          setConfirmed(false)
                        }}
                      />
                      <span>{d === 'members' ? t.datasetMembers : t.datasetApplications}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset className="yop-fieldset">
              <legend className="yop-label">{t.exportPurposeChoice}</legend>
              {forDataset.length ? (
                <div className="yop-purposes">
                  {forDataset.map((p) => (
                    <label key={p.id} className="yop-purpose">
                      <input
                        type="radio"
                        name="purpose"
                        value={p.id}
                        checked={purposeId === p.id}
                        onChange={() => choosePurpose(p)}
                      />
                      <span className="yop-purpose__text">
                        <span className="yop-purpose__name">{p.name}</span>
                        {p.description && (
                          <span className="yop-purpose__description">{p.description}</span>
                        )}
                        <span className="yop-purpose__basis">
                          {p.basis.article} · {p.basis.title}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <Notice tone="warning">
                  {t.exportNoPurpose}{' '}
                  {canManagePurposes && (
                    <Link
                      className="yop-link"
                      href="/admin/collections/processing-purposes"
                      prefetch={false}
                    >
                      {draftPurposes
                        ? fill(t.exportDraftPurposes, { count: draftPurposes })
                        : t.exportManagePurposes}
                    </Link>
                  )}
                </Notice>
              )}
            </fieldset>

            {purpose && (
              <section className="yop-basis" aria-labelledby={`${id}-basis`}>
                <h3 id={`${id}-basis`} className="yop-basis__title">
                  <Icon name="shield" />
                  {t.exportLegalBasis}: {purpose.basis.article} – {purpose.basis.title}
                </h3>
                <details className="yop-basis__details">
                  <summary>{t.exportBasisExplanation}</summary>
                  <p>{purpose.basis.explanation}</p>
                </details>
                <dl className="yop-basis__facts">
                  <div>
                    <dt>{t.exportJustification}</dt>
                    <dd>{purpose.justification}</dd>
                  </div>
                  <div>
                    <dt>{t.exportDecision}</dt>
                    <dd>
                      {purpose.decision}
                      {purpose.approvedOn && (
                        <>
                          {' '}
                          · <bdi>{purpose.approvedOn}</bdi>
                        </>
                      )}
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            <fieldset className="yop-fieldset" disabled={!purpose}>
              <legend className="yop-label">{t.exportSelection}</legend>
              <div className="yop-form__row">
                <div>
                  <label className="yop-label yop-label--small" htmlFor={`${id}-scope`}>
                    {dataset === 'applications' ? t.colStage : t.colStatus}
                  </label>
                  {dataset === 'applications' ? (
                    <select
                      id={`${id}-scope`}
                      className="yop-input yop-select"
                      value={stage}
                      onChange={(e) => setStage(e.target.value)}
                    >
                      {STAGES.map((value) => (
                        <option key={value} value={value}>
                          {t[`stage_${value}` as keyof typeof t] as string}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      id={`${id}-scope`}
                      className="yop-input yop-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {MEMBER_STATUSES.map((value) => (
                        <option key={value} value={value}>
                          {t[`member_${value}` as keyof typeof t] as string}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="yop-label yop-label--small" htmlFor={`${id}-type`}>
                    {t.filterType}
                  </label>
                  <select
                    id={`${id}-type`}
                    className="yop-input yop-select"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="all">{t.typeAll}</option>
                    <option value="ordinary">{t.type_ordinary}</option>
                    <option value="supporting">{t.type_supporting}</option>
                  </select>
                </div>
                <div>
                  <label className="yop-label yop-label--small" htmlFor={`${id}-q`}>
                    {t.search}
                  </label>
                  <input
                    id={`${id}-q`}
                    className="yop-input"
                    type="search"
                    value={q}
                    maxLength={100}
                    placeholder={t.searchHint}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="yop-fieldset" disabled={!purpose}>
              <legend className="yop-label">{t.exportColumns}</legend>
              {purpose ? (
                <>
                  <p className="yop-hint">{t.exportColumnsOfPurpose}</p>
                  <div className="yop-checks">
                    {available.map((column) => (
                      <label key={column.key} className="yop-check">
                        <input
                          type="checkbox"
                          checked={chosen.includes(column.key)}
                          onChange={() => toggle(column.key)}
                        />
                        <span>{column.label}</span>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <p className="yop-hint">{t.exportChoosePurposeFirst}</p>
              )}
            </fieldset>

            <div>
              <label className="yop-label" htmlFor={`${id}-occasion`}>
                {t.exportOccasion}
              </label>
              <textarea
                id={`${id}-occasion`}
                className="yop-input yop-textarea"
                rows={3}
                maxLength={300}
                required
                disabled={!purpose}
                aria-describedby={`${id}-occasion-hint`}
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
              />
              <p id={`${id}-occasion-hint`} className="yop-hint">
                {t.exportOccasionHint} ({occasionLength}/300)
              </p>
            </div>

            <div>
              <label className="yop-label" htmlFor={`${id}-separator`}>
                {t.exportSeparator}
              </label>
              <select
                id={`${id}-separator`}
                className="yop-input yop-select"
                value={separator}
                disabled={!purpose}
                onChange={(e) => setSeparator(e.target.value === ',' ? ',' : ';')}
              >
                <option value=";">{t.exportSeparatorSemicolon}</option>
                <option value=",">{t.exportSeparatorComma}</option>
              </select>
            </div>

            <label className="yop-check yop-check--confirm">
              <input
                type="checkbox"
                checked={confirmed}
                disabled={!purpose}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>{t.exportConfirm}</span>
            </label>

            {message && (
              <Notice tone={message.tone} live>
                {message.text}
              </Notice>
            )}
            <div className="yop-form__actions">
              <button
                type="button"
                className="yop-button yop-button--primary"
                disabled={!ready || busy}
                onClick={() => void run()}
              >
                <Icon name="download" />
                {t.exportButton}
              </button>
              <span className="yop-hint">{t.exportCsvNote}</span>
            </div>
          </div>
        </section>
        <section className="yop-card" aria-labelledby={`${id}-recent`}>
          <div className="yop-card__head">
            <h2 id={`${id}-recent`}>{t.recentExports}</h2>
            <Link
              className="yop-link yop-card__more"
              href="/admin/collections/exports"
              prefetch={false}
            >
              {t.openRegister}
            </Link>
          </div>
          {recent.length ? (
            <ul className="yop-list">
              {recent.map((entry) => (
                <li key={entry.id}>
                  <Link href={`/admin/collections/exports/${entry.id}`} prefetch={false}>
                    <span className="yop-list__title">{entry.purpose}</span>
                    <span className="yop-list__meta">
                      {entry.purposeName ? `${entry.purposeName} · ` : ''}
                      {entry.dataset === 'members'
                        ? t.datasetMembers
                        : t.datasetApplications} · {fill(t.rowsLabel, { rows: entry.rows })} ·{' '}
                      <bdi>{entry.when}</bdi>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="yop-empty">{t.nothingYet}</p>
          )}
        </section>
      </div>
      <StepUpDialog open={stepUp} onClose={() => setStepUp(false)} onConfirmed={() => void run()} />
    </div>
  )
}
