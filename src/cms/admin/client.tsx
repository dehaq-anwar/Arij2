'use client'

import { useTranslation } from '@payloadcms/ui'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

import { adminLanguage, adminTexts, fill } from './i18n'
import { Icon } from './icons'

/** The admin language the person chose in Payload, with our texts for it. */
export function useAdminText() {
  const { i18n } = useTranslation()
  const lang = adminLanguage(i18n.language)
  return { lang, t: adminTexts[lang] }
}

export type ApiResult<T = Record<string, unknown>> = {
  status: number
  data: T & { error?: string }
}

/** POST to the account endpoints of this Control Center (same origin, session cookie). */
export async function postAccount<T = Record<string, unknown>>(
  path: string,
  body: Record<string, unknown> = {},
): Promise<ApiResult<T>> {
  const response = await fetch(`/api/users${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await response.json().catch(() => ({}))) as T & { error?: string }
  return { status: response.status, data }
}

/** Six digits from an authenticator app: numeric keyboard, one-time-code autofill. */
export function CodeInput({
  id,
  value,
  onChange,
  invalid,
  describedBy,
  onEnter,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  describedBy?: string
  onEnter?: () => void
}) {
  return (
    <input
      id={id}
      className="yop-input yop-input--code"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      required
      dir="ltr"
      value={value}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && onEnter) {
          event.preventDefault()
          onEnter()
        }
      }}
    />
  )
}

export function Notice({
  tone,
  children,
  live = false,
}: {
  tone: 'info' | 'error' | 'success' | 'warning'
  children: ReactNode
  live?: boolean
}) {
  const icon =
    tone === 'error' || tone === 'warning' ? 'alert' : tone === 'success' ? 'check' : 'info'
  return (
    <div
      className={`yop-notice yop-notice--${tone}`}
      role={live ? (tone === 'error' ? 'alert' : 'status') : undefined}
    >
      <Icon name={icon} />
      <div>{children}</div>
    </div>
  )
}

/**
 * Asks for a fresh code before a sensitive action (step-up, valid five minutes on the server).
 * A native <dialog>: it moves focus to the code field, keeps it inside and closes on Escape.
 */
export function StepUpDialog({
  open,
  onClose,
  onConfirmed,
}: {
  open: boolean
  onClose: () => void
  onConfirmed: () => void
}) {
  const { t } = useAdminText()
  const ref = useRef<HTMLDialogElement>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputId = useId()
  const errorId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setCode('')
      setError(null)
      dialog.showModal()
    } else if (!open && dialog.open) dialog.close()
  }, [open])

  // No <form>: the dialog is often rendered inside Payload's document form, and forms
  // cannot be nested. Enter in the field submits instead.
  async function submit() {
    if (busy || code.length !== 6) return
    setBusy(true)
    setError(null)
    const { status, data } = await postAccount('/mfa/step-up', { code })
    setBusy(false)
    if (status === 200) {
      onConfirmed()
      onClose()
      return
    }
    setError(
      data.error === 'locked'
        ? t.mfaLocked
        : data.error === 'rate_limited'
          ? t.rateLimited
          : t.invalidCode,
    )
  }

  return (
    <dialog ref={ref} className="yop-dialog" aria-labelledby={`${inputId}-title`} onClose={onClose}>
      <div className="yop-dialog__body">
        <div className="yop-dialog__icon">
          <Icon name="lock" />
        </div>
        <h2 id={`${inputId}-title`}>{t.stepUpTitle}</h2>
        <p>{t.stepUpLead}</p>
        <label className="yop-label" htmlFor={inputId}>
          {t.code}
        </label>
        <CodeInput
          id={inputId}
          value={code}
          onChange={setCode}
          invalid={Boolean(error)}
          describedBy={error ? errorId : undefined}
          onEnter={() => void submit()}
        />
        {error && (
          <p id={errorId} className="yop-field-error" role="alert">
            {error}
          </p>
        )}
        <div className="yop-dialog__actions">
          <button type="button" className="yop-button yop-button--ghost" onClick={onClose}>
            {t.cancel}
          </button>
          <button
            type="button"
            className="yop-button yop-button--primary"
            disabled={busy || code.length !== 6}
            onClick={() => void submit()}
          >
            {t.confirm}
          </button>
        </div>
      </div>
    </dialog>
  )
}

/** Remaining minutes of a step-up confirmation, counting down. */
export function useStepUpCountdown(validUntil: number | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!validUntil) return
    const timer = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(timer)
  }, [validUntil])
  if (!validUntil || validUntil <= now) return null
  return Math.max(1, Math.ceil((validUntil - now) / 60_000))
}

export { fill }
