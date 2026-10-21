'use client'

import { useDocumentInfo, useFormModified } from '@payloadcms/ui'
import { useEffect, useId, useState } from 'react'

import { apiJson, fill, Notice, StepUpDialog, useAdminText } from '../client'
import { formatDate } from '../i18n'
import { Icon } from '../icons'

type PurposeDoc = {
  status?: 'draft' | 'approved' | 'retired'
  decisionReference?: string | null
  approvedOn?: string | null
  approvedByName?: string | null
}
type Action = 'approve' | 'retire' | 'reopen'

/**
 * Approval of a processing purpose (sidebar of its screen): a draft is approved with the
 * association's decision, an approved purpose can be retired, a retired one reopened as draft.
 * Each step needs `settings.manage` and a fresh code; the server checks both and records it.
 */
export function PurposePanel() {
  const { t, lang } = useAdminText()
  const { id, docPermissions } = useDocumentInfo()
  const modified = useFormModified()
  const fieldId = useId()
  const [doc, setDoc] = useState<PurposeDoc | null>(null)
  const [decision, setDecision] = useState('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Action | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    if (!id) return
    let current = true
    void apiJson<PurposeDoc>(`/processing-purposes/${id}?depth=0`).then((result) => {
      if (current && result.status === 200) setDoc(result.data)
    })
    return () => {
      current = false
    }
  }, [id])

  if (!id) return null
  const canManage = Boolean(docPermissions?.update)
  const status = doc?.status ?? 'draft'

  async function run(action: Action) {
    if (action === 'retire' && !window.confirm(t.confirmRetire)) return
    setBusy(true)
    setErrors([])
    const result = await apiJson<{ error?: string; problems?: string[] }>(
      `/processing-purposes/${id}/${action}`,
      { method: 'POST', body: action === 'approve' ? { decisionReference: decision } : {} },
    )
    setBusy(false)
    if (result.status === 200) {
      window.location.reload()
      return
    }
    if (result.status === 403 && result.data.error === 'step_up_required') {
      setPending(action)
      return
    }
    const problems = result.data.problems ?? []
    setErrors(
      problems.length
        ? problems.map((p) => t[`purposeProblem_${p}` as keyof typeof t] as string)
        : [t.genericError],
    )
  }

  return (
    <section className="yop-case" aria-labelledby={`${fieldId}-title`}>
      <h3 id={`${fieldId}-title`} className="yop-case__title">
        <Icon name="shield" />
        {t.purposeApproval}
      </h3>
      <p className="yop-case__stage">
        <span className="yop-hint">{t.colStatus}</span>
        <span
          className={`yop-pill ${
            status === 'approved'
              ? 'yop-pill--good'
              : status === 'retired'
                ? 'yop-pill--neutral'
                : 'yop-pill--warning'
          }`}
        >
          {t[`purposeStatus_${status}` as keyof typeof t] as string}
        </span>
      </p>
      {status === 'approved' && doc && (
        <p className="yop-hint">
          {fill(t.purposeApprovedInfo, {
            date: formatDate(doc.approvedOn ?? null, lang),
            name: doc.approvedByName ?? '—',
          })}{' '}
          {t.exportDecision}: <bdi>{doc.decisionReference}</bdi>
        </p>
      )}
      {status === 'draft' && <p className="yop-hint">{t.purposeDraftHint}</p>}
      {status === 'retired' && <p className="yop-hint">{t.purposeRetiredHint}</p>}
      <p className="yop-hint">{t.purposeChangeHint}</p>

      {canManage && doc && (
        <div className="yop-case__actions">
          {modified && <p className="yop-hint">{t.saveFirst}</p>}
          {status === 'draft' && (
            <>
              <label className="yop-label yop-label--small" htmlFor={`${fieldId}-decision`}>
                {t.purposeDecisionLabel}
              </label>
              <input
                id={`${fieldId}-decision`}
                className="yop-input"
                maxLength={200}
                value={decision}
                aria-describedby={`${fieldId}-decision-hint`}
                onChange={(e) => setDecision(e.target.value)}
              />
              <p id={`${fieldId}-decision-hint`} className="yop-hint">
                {t.purposeDecisionHint}
              </p>
              <button
                type="button"
                className="yop-button yop-button--primary yop-button--small yop-button--block"
                disabled={busy || modified || decision.trim().length < 5}
                onClick={() => void run('approve')}
              >
                <Icon name="check" />
                {t.purposeApprove}
              </button>
            </>
          )}
          {status === 'approved' && (
            <button
              type="button"
              className="yop-button yop-button--small yop-button--block"
              disabled={busy || modified}
              onClick={() => void run('retire')}
            >
              {t.purposeRetire}
            </button>
          )}
          {status === 'retired' && (
            <button
              type="button"
              className="yop-button yop-button--small yop-button--block"
              disabled={busy || modified}
              onClick={() => void run('reopen')}
            >
              {t.purposeReopen}
            </button>
          )}
        </div>
      )}
      {errors.length > 0 && (
        <Notice tone="error" live>
          <ul className="yop-plain-list">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Notice>
      )}
      <StepUpDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirmed={() => {
          const action = pending
          setPending(null)
          if (action) void run(action)
        }}
      />
    </section>
  )
}
