'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'

import { apiJson, fill, Notice, StepUpDialog, useAdminText, type ApiResult } from '../client'
import { Icon } from '../icons'
import { opsTexts } from './texts'

export function useOpsText() {
  const { lang } = useAdminText()
  return { lang, o: opsTexts[lang] }
}

type Outcome = { tone: 'success' | 'error' | 'warning'; text: string } | null

/** Messages for the answers every operations action can get. */
function errorText(o: (typeof opsTexts)['de'], result: ApiResult): string {
  switch (result.data.error) {
    case 'unreachable':
      return o.unreachable
    case 'not_configured':
      return o.agentMissingTitle
    case 'too_many':
      return o.tooMany
    case 'too_soon':
      return o.tooSoon
    case 'busy':
      return o.busy
    case 'not_allowed':
      return o.notAllowed
    case 'confirm':
      return o.confirmMismatch
    default:
      return o.failed
  }
}

/**
 * Runs an action; when the server asks for a fresh code, asks for it and runs the action again.
 * Returns the controls' state and the dialog to render.
 */
function useAction(run: () => Promise<ApiResult>, onDone: (result: ApiResult) => Outcome) {
  const { o } = useOpsText()
  const [busy, setBusy] = useState(false)
  const [stepUp, setStepUp] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>(null)
  async function start() {
    setBusy(true)
    setOutcome(null)
    const result = await run().catch(() => ({ status: 0, data: { error: 'failed' } }) as ApiResult)
    setBusy(false)
    if (result.status === 403 && result.data.error === 'step_up_required') {
      setStepUp(true)
      return
    }
    if (result.status >= 200 && result.status < 300) setOutcome(onDone(result))
    else setOutcome({ tone: 'error', text: errorText(o, result) })
  }
  const dialog = (
    <StepUpDialog open={stepUp} onClose={() => setStepUp(false)} onConfirmed={() => void start()} />
  )
  return { busy, outcome, start, dialog }
}

function Result({ outcome }: { outcome: Outcome }) {
  return (
    <div className="yop-ops-result" aria-live="polite">
      {outcome ? <Notice tone={outcome.tone}>{outcome.text}</Notice> : null}
    </div>
  )
}

/** "Check now": collects the status right away and shows the page again. */
export function RefreshButton() {
  const { o } = useOpsText()
  const router = useRouter()
  const action = useAction(
    () => apiJson('/operations/refresh', { method: 'POST' }),
    () => {
      router.refresh()
      return { tone: 'success', text: o.updated }
    },
  )
  return (
    <div className="yop-ops-action">
      <button
        type="button"
        className="yop-button"
        disabled={action.busy}
        onClick={() => void action.start()}
      >
        <Icon name="restart" />
        {action.busy ? o.checking : o.checkNow}
      </button>
      <Result outcome={action.outcome} />
    </div>
  )
}

/** Backup or restore drill now (operations.act, code). */
export function AgentJobButton({ kind, primary }: { kind: 'backup' | 'drill'; primary?: boolean }) {
  const { o } = useOpsText()
  const router = useRouter()
  const action = useAction(
    () => apiJson(`/operations/${kind}`, { method: 'POST' }),
    () => {
      setTimeout(() => router.refresh(), 2_000)
      return { tone: 'success', text: kind === 'backup' ? o.backupStarted : o.drillStarted }
    },
  )
  return (
    <div className="yop-ops-action">
      <button
        type="button"
        className={`yop-button${primary ? ' yop-button--primary' : ''}`}
        disabled={action.busy}
        onClick={() => void action.start()}
      >
        <Icon name={kind === 'backup' ? 'backup' : 'restart'} />
        {kind === 'backup' ? o.backupNow : o.drillNow}
      </button>
      <Result outcome={action.outcome} />
      {action.dialog}
    </div>
  )
}

/** Run a scheduled task now (jobs.run; tasks that delete need a code). */
export function JobButton({ task, label }: { task: string; label: string }) {
  const { o } = useOpsText()
  const router = useRouter()
  const action = useAction(
    () => apiJson('/operations/jobs/run', { method: 'POST', body: { task } }),
    () => {
      router.refresh()
      return { tone: 'success', text: o.jobRan }
    },
  )
  return (
    <div className="yop-ops-action yop-ops-action--inline">
      <button
        type="button"
        className="yop-button yop-button--small"
        disabled={action.busy}
        aria-label={`${o.runNow}: ${label}`}
        onClick={() => void action.start()}
      >
        <Icon name="play" />
        {o.runNow}
      </button>
      <Result outcome={action.outcome} />
      {action.dialog}
    </div>
  )
}

/** Check the certificates again now. */
export function CertificatesButton() {
  const { o } = useOpsText()
  const router = useRouter()
  const action = useAction(
    () => apiJson('/operations/certificates', { method: 'POST' }),
    () => {
      router.refresh()
      return { tone: 'success', text: o.updated }
    },
  )
  return (
    <div className="yop-ops-action">
      <button
        type="button"
        className="yop-button"
        disabled={action.busy}
        onClick={() => void action.start()}
      >
        <Icon name="lock" />
        {action.busy ? o.checking : o.checkNow}
      </button>
      <Result outcome={action.outcome} />
    </div>
  )
}

/**
 * Restart of a service: a dialog that says what happens, the service's name typed as
 * confirmation, then a code (operations.act). Restarting the app or Caddy interrupts this page,
 * so it reloads itself afterwards.
 */
export function RestartButton({ service, name }: { service: string; name: string }) {
  const { o } = useOpsText()
  const { t } = useAdminText()
  const ref = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const inputId = useId()
  const titleId = useId()
  const action = useAction(
    () => apiJson('/operations/restart', { method: 'POST', body: { service, confirm: typed } }),
    () => {
      setOpen(false)
      // The app (and with Caddy, the way to it) is back after a few seconds.
      setTimeout(() => window.location.reload(), service === 'app' ? 12_000 : 6_000)
      return { tone: 'success', text: o.restartDone }
    },
  )
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setTyped('')
      dialog.showModal()
    } else if (!open && dialog.open) dialog.close()
  }, [open])
  const matches = typed.trim() === service
  return (
    <div className="yop-ops-action yop-ops-action--inline">
      <button
        type="button"
        className="yop-button yop-button--small"
        aria-label={`${o.restart}: ${name}`}
        onClick={() => setOpen(true)}
      >
        <Icon name="restart" />
        {o.restart}
      </button>
      <Result outcome={action.outcome} />
      <dialog
        ref={ref}
        className="yop-dialog"
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
      >
        <div className="yop-dialog__body">
          <div className="yop-dialog__icon yop-dialog__icon--warning">
            <Icon name="alert" />
          </div>
          <h2 id={titleId}>{o.restartTitle}</h2>
          <p>{fill(o.restartBody, { service: name })}</p>
          {service === 'app' || service === 'caddy' ? <p>{o.restartAppNote}</p> : null}
          <label className="yop-label" htmlFor={inputId}>
            {fill(o.restartConfirm, { name: service })}
          </label>
          <input
            id={inputId}
            className="yop-input yop-input--mono"
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && matches) {
                event.preventDefault()
                void action.start()
              }
            }}
          />
          <div className="yop-dialog__actions">
            <button
              type="button"
              className="yop-button yop-button--ghost"
              onClick={() => setOpen(false)}
            >
              {t.cancel}
            </button>
            <button
              type="button"
              className="yop-button yop-button--danger"
              disabled={!matches || action.busy}
              onClick={() => void action.start()}
            >
              <Icon name="restart" />
              {o.restart}
            </button>
          </div>
        </div>
      </dialog>
      {action.dialog}
    </div>
  )
}
