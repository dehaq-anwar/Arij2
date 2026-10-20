'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'

import type { AdminLanguage, adminTexts } from '../i18n'
import { fill } from '../i18n'
import { Icon } from '../icons'
import logoLight from '../../../assets/logo/yop-logo-light.png'

export type SignInStep = 'password' | 'verify' | 'enroll' | 'codes'
type Texts = (typeof adminTexts)['de']

type Props = {
  initialStep: SignInStep
  initialName: string | null
  destination: string
  language: AdminLanguage
  texts: Texts
}

async function post(path: string, body: Record<string, unknown> = {}) {
  const response = await fetch(`/api/users${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  return { status: response.status, data }
}

const LANGUAGES: { code: AdminLanguage; label: string; name: string }[] = [
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ar', label: 'ع', name: 'العربية' },
]

/** The QR code as crisp SVG squares on white (scanners need the light background). */
function QrCode({ rows, label }: { rows: string[]; label: string }) {
  const size = rows.length
  const margin = 3
  let path = ''
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++)
      if (row[x] === '1') path += `M${x + margin} ${y + margin}h1v1h-1z`
  })
  return (
    <svg
      className="yop-qr"
      viewBox={`0 0 ${size + margin * 2} ${size + margin * 2}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width="100%" height="100%" fill="#fff" />
      <path d={path} fill="#021b2b" />
    </svg>
  )
}

/**
 * Sign-in in up to three steps: password → code from the authenticator app (or a recovery
 * code) → done. Accounts without a second factor set it up in between and receive their
 * recovery codes once. All checks happen on the server (src/cms/auth/endpoints.ts).
 */
export function SignInClient({ initialStep, initialName, destination, language, texts: t }: Props) {
  const [step, setStep] = useState<SignInStep>(initialStep)
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [useRecovery, setUseRecovery] = useState(false)
  const [recovery, setRecovery] = useState('')
  const [enrollment, setEnrollment] = useState<{
    qr: string[]
    secret: string
    uri: string
  } | null>(null)
  const [codes, setCodes] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const ids = {
    email: useId(),
    password: useId(),
    code: useId(),
    recovery: useId(),
    error: useId(),
    saved: useId(),
  }

  // Each step announces itself: focus goes to its heading.
  useEffect(() => {
    headingRef.current?.focus()
  }, [step, useRecovery])

  useEffect(() => {
    if (step !== 'enroll' || enrollment) return
    let cancelled = false
    void post('/mfa/enroll').then(({ status, data }) => {
      if (cancelled) return
      if (status === 200) setEnrollment(data as { qr: string[]; secret: string; uri: string })
      else backToPassword(t.sessionExpired)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per enrolment step
  }, [step])

  function backToPassword(message: string | null) {
    setStep('password')
    setCode('')
    setRecovery('')
    setUseRecovery(false)
    setEnrollment(null)
    setPassword('')
    setError(null)
    setNotice(message)
  }

  const done = () => window.location.assign(destination)

  function codeError(data: Record<string, unknown>) {
    switch (data.error) {
      case 'invalid_code':
        return typeof data.attemptsLeft === 'number'
          ? `${t.invalidCode} ${fill(t.attemptsLeft, { n: data.attemptsLeft })}`
          : t.invalidCode
      case 'rate_limited':
        return t.rateLimited
      default:
        return t.genericError
    }
  }

  async function submitPassword(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    const { status, data } = await post('/login', { email, password })
    if (status !== 200) {
      setBusy(false)
      const message = String(
        (data.errors as { message?: string }[] | undefined)?.[0]?.message ?? '',
      )
      setError(
        status === 429
          ? t.rateLimited
          : status === 403
            ? t.accountDisabled
            : /lock/i.test(message)
              ? t.accountLocked
              : t.wrongPassword,
      )
      return
    }
    const state = await post('/mfa/state')
    setBusy(false)
    setPassword('')
    if (state.data.state === 'active') return done()
    if (state.data.state === 'verify' || state.data.state === 'enroll') {
      setName(typeof state.data.name === 'string' ? state.data.name : null)
      if (state.data.locked) setNotice(t.mfaLocked)
      setStep(state.data.state)
      return
    }
    setError(t.genericError)
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const { status, data } = await post(
      '/mfa/verify',
      useRecovery ? { recoveryCode: recovery } : { code },
    )
    setBusy(false)
    if (status === 200) return done()
    if (data.error === 'too_many_attempts') return backToPassword(t.tooManyAttempts)
    if (data.error === 'locked') return backToPassword(t.mfaLocked)
    if (data.error === 'no_pending') return backToPassword(t.sessionExpired)
    setCode('')
    setError(codeError(data))
  }

  async function submitEnrollment(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const { status, data } = await post('/mfa/enroll/confirm', { code })
    setBusy(false)
    if (status === 200 && Array.isArray(data.recoveryCodes)) {
      setCodes(data.recoveryCodes as string[])
      setStep('codes')
      return
    }
    if (data.error === 'too_many_attempts') return backToPassword(t.tooManyAttempts)
    if (data.error === 'no_pending') return backToPassword(t.sessionExpired)
    setCode('')
    setError(codeError(data))
  }

  async function cancel() {
    await post('/mfa/cancel')
    backToPassword(null)
  }

  function switchLanguage(code: AdminLanguage) {
    document.cookie = `payload-lng=${code}; path=/; max-age=31536000; SameSite=Lax`
    window.location.reload()
  }

  async function copyCodes() {
    await navigator.clipboard.writeText(codes.join('\n'))
    setCopied(true)
  }

  function downloadCodes() {
    const text = `Youth of Peace – Control Center\n${t.recoveryTitle}\n\n${codes.join('\n')}\n`
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'youth-of-peace-recovery-codes.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  const errorBox = error && (
    <p id={ids.error} className="yop-field-error" role="alert">
      <Icon name="alert" />
      {error}
    </p>
  )

  return (
    <div className="yop-signin">
      <aside className="yop-signin__brand" aria-hidden="true">
        <div className="yop-signin__brand-inner">
          {/* eslint-disable-next-line @next/next/no-img-element -- static asset, admin only */}
          <img src={logoLight.src} alt="" className="yop-signin__logo" />
          <p className="yop-signin__eyebrow">{t.association}</p>
          <p className="yop-signin__product">{t.controlCenter}</p>
          <p className="yop-signin__note">
            <Icon name="shield" />
            {t.securityNote}
          </p>
        </div>
        <span className="yop-signin__ring yop-signin__ring--a" />
        <span className="yop-signin__ring yop-signin__ring--b" />
      </aside>

      <main className="yop-signin__panel">
        <div className="yop-signin__top">
          <div className="yop-segmented" role="group" aria-label={t.language}>
            {LANGUAGES.map((option) => (
              <button
                key={option.code}
                type="button"
                lang={option.code}
                aria-pressed={option.code === language}
                aria-label={option.name}
                onClick={() => switchLanguage(option.code)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="yop-signin__card">
          <div className="yop-signin__mobile-brand" aria-hidden="true">
            <span className="yop-brand-mark">
              {/* eslint-disable-next-line @next/next/no-img-element -- static asset */}
              <img src={logoLight.src} alt="" />
            </span>
            <span>{t.controlCenter}</span>
          </div>

          {notice && (
            <div className="yop-notice yop-notice--warning" role="status">
              <Icon name="info" />
              <div>{notice}</div>
            </div>
          )}

          {step === 'password' && (
            <form onSubmit={submitPassword} noValidate={false}>
              <h1 ref={headingRef} tabIndex={-1}>
                {t.signInTitle}
              </h1>
              <p className="yop-lead">{t.signInLead}</p>
              <label className="yop-label" htmlFor={ids.email}>
                {t.email}
              </label>
              <input
                id={ids.email}
                className="yop-input"
                type="email"
                autoComplete="username"
                dir="ltr"
                required
                value={email}
                aria-invalid={Boolean(error) || undefined}
                aria-describedby={error ? ids.error : undefined}
                onChange={(event) => setEmail(event.target.value)}
              />
              <label className="yop-label" htmlFor={ids.password}>
                {t.password}
              </label>
              <input
                id={ids.password}
                className="yop-input"
                type="password"
                autoComplete="current-password"
                dir="ltr"
                required
                value={password}
                aria-invalid={Boolean(error) || undefined}
                aria-describedby={error ? ids.error : undefined}
                onChange={(event) => setPassword(event.target.value)}
              />
              {errorBox}
              <button
                type="submit"
                className="yop-button yop-button--primary yop-button--block"
                disabled={busy}
              >
                {t.continue}
                <Icon name="arrow" className="yop-flip" />
              </button>
              <Link className="yop-link yop-signin__forgot" href="/admin/forgot">
                {t.forgotPassword}
              </Link>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={submitCode}>
              <h1 ref={headingRef} tabIndex={-1}>
                {useRecovery ? t.recoveryCode : t.codeTitle}
              </h1>
              {name && <p className="yop-signin__who">{name}</p>}
              <p className="yop-lead">{useRecovery ? t.recoveryHint : t.codeLead}</p>
              {useRecovery ? (
                <>
                  <label className="yop-label" htmlFor={ids.recovery}>
                    {t.recoveryCode}
                  </label>
                  <input
                    id={ids.recovery}
                    className="yop-input yop-input--mono"
                    autoComplete="off"
                    spellCheck={false}
                    dir="ltr"
                    required
                    value={recovery}
                    aria-invalid={Boolean(error) || undefined}
                    aria-describedby={error ? ids.error : undefined}
                    onChange={(event) => setRecovery(event.target.value)}
                    placeholder="XXXXX-XXXXX"
                  />
                </>
              ) : (
                <>
                  <label className="yop-label" htmlFor={ids.code}>
                    {t.code}
                  </label>
                  <input
                    id={ids.code}
                    className="yop-input yop-input--code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    dir="ltr"
                    required
                    value={code}
                    aria-invalid={Boolean(error) || undefined}
                    aria-describedby={error ? ids.error : undefined}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </>
              )}
              {errorBox}
              <button
                type="submit"
                className="yop-button yop-button--primary yop-button--block"
                disabled={
                  busy ||
                  (!useRecovery && code.length !== 6) ||
                  (useRecovery && recovery.trim().length < 10)
                }
              >
                {t.confirm}
              </button>
              <div className="yop-signin__alt">
                <button
                  type="button"
                  className="yop-link"
                  onClick={() => {
                    setUseRecovery(!useRecovery)
                    setError(null)
                  }}
                >
                  {useRecovery ? t.useApp : t.useRecovery}
                </button>
                <button type="button" className="yop-link" onClick={cancel}>
                  {t.cancel}
                </button>
              </div>
            </form>
          )}

          {step === 'enroll' && (
            <form onSubmit={submitEnrollment}>
              <h1 ref={headingRef} tabIndex={-1}>
                {t.enrollTitle}
              </h1>
              {name && <p className="yop-signin__who">{name}</p>}
              <p className="yop-lead">{t.enrollLead}</p>
              <ol className="yop-steps">
                <li>{t.enrollStep1}</li>
                <li>
                  {t.enrollStep2}
                  <div className="yop-enroll">
                    {enrollment ? (
                      <>
                        <QrCode rows={enrollment.qr} label={t.qrLabel} />
                        <div className="yop-enroll__secret">
                          <span className="yop-label">{t.secretLabel}</span>
                          <code dir="ltr">{enrollment.secret}</code>
                        </div>
                      </>
                    ) : (
                      <div className="yop-qr yop-qr--loading" aria-busy="true" />
                    )}
                  </div>
                </li>
                <li>
                  <label className="yop-label" htmlFor={ids.code}>
                    {t.enrollStep3}
                  </label>
                  <input
                    id={ids.code}
                    className="yop-input yop-input--code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    dir="ltr"
                    required
                    value={code}
                    aria-invalid={Boolean(error) || undefined}
                    aria-describedby={error ? ids.error : undefined}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </li>
              </ol>
              {errorBox}
              <button
                type="submit"
                className="yop-button yop-button--primary yop-button--block"
                disabled={busy || code.length !== 6 || !enrollment}
              >
                {t.confirm}
              </button>
              <div className="yop-signin__alt">
                <button type="button" className="yop-link" onClick={cancel}>
                  {t.cancel}
                </button>
              </div>
            </form>
          )}

          {step === 'codes' && (
            <div>
              <h1 ref={headingRef} tabIndex={-1}>
                {t.recoveryTitle}
              </h1>
              <p className="yop-lead">{t.recoveryLead}</p>
              <ul className="yop-codes" dir="ltr">
                {codes.map((value) => (
                  <li key={value}>
                    <code>{value}</code>
                  </li>
                ))}
              </ul>
              <div className="yop-row">
                <button type="button" className="yop-button" onClick={copyCodes}>
                  <Icon name={copied ? 'check' : 'copy'} />
                  {copied ? t.copied : t.copy}
                </button>
                <button type="button" className="yop-button" onClick={downloadCodes}>
                  <Icon name="download" />
                  {t.download}
                </button>
              </div>
              <label className="yop-check" htmlFor={ids.saved}>
                <input
                  id={ids.saved}
                  type="checkbox"
                  checked={saved}
                  onChange={(event) => setSaved(event.target.checked)}
                />
                <span>{t.savedConfirm}</span>
              </label>
              <button
                type="button"
                className="yop-button yop-button--primary yop-button--block"
                disabled={!saved}
                onClick={done}
              >
                {t.toControlCenter}
                <Icon name="arrow" className="yop-flip" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
