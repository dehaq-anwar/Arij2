'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { formatDate } from '../i18n'
import { Notice, postAccount, StepUpDialog, useAdminText } from '../client'
import { Icon, type IconName } from '../icons'

type SessionRow = {
  sid: string
  browser: string | null
  os: string | null
  deviceClass: string | null
  started: string
  lastSeen: string
}
type DeviceRow = {
  id: number
  browser: string | null
  os: string | null
  deviceClass: string | null
  lastSeen: string
  current: boolean
}
type EventRow = { id: number; label: string; when: string; failed: boolean; detail: string }

type Props = {
  enabledAt: string | null
  recoveryLeft: number
  currentSid: string
  sessions: SessionRow[]
  devices: DeviceRow[]
  events: EventRow[]
}

const deviceIcon = (deviceClass: string | null): IconName =>
  deviceClass === 'mobile' ? 'phone' : deviceClass === 'tablet' ? 'tablet' : 'device'

export function SecurityClient({
  enabledAt,
  recoveryLeft,
  currentSid,
  sessions,
  devices,
  events,
}: Props) {
  const { lang, t } = useAdminText()
  const router = useRouter()
  const [stepUpFor, setStepUpFor] = useState<null | (() => Promise<void>)>(null)
  const [codes, setCodes] = useState<string[] | null>(null)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const deviceName = (row: { browser: string | null; os: string | null }) =>
    [row.browser, row.os].filter((part) => part && part !== 'Other').join(' · ') || t.unknown

  async function run(
    action: () => Promise<{ status: number; data: { error?: string } }>,
    retry?: () => Promise<void>,
  ) {
    setBusy(true)
    setMessage(null)
    const { status, data } = await action()
    setBusy(false)
    if (status === 403 && data.error === 'step_up_required' && retry) {
      setStepUpFor(() => retry)
      return false
    }
    if (status !== 200) {
      setMessage({ tone: 'error', text: t.genericError })
      return false
    }
    return true
  }

  async function regenerate() {
    const ok = await run(async () => {
      const result = await postAccount<{ recoveryCodes?: string[] }>('/mfa/recovery-codes')
      if (result.status === 200 && result.data.recoveryCodes) setCodes(result.data.recoveryCodes)
      return result
    }, regenerate)
    if (ok) router.refresh()
  }

  async function revoke(sid: string) {
    if (await run(() => postAccount('/sessions/revoke', { sid }))) {
      setMessage({ tone: 'success', text: t.done })
      router.refresh()
    }
  }

  async function revokeOthers() {
    if (await run(() => postAccount('/sessions/revoke', { others: true }))) {
      setMessage({ tone: 'success', text: t.done })
      router.refresh()
    }
  }

  async function forget(id: number) {
    if (await run(() => postAccount('/devices/forget', { id }))) router.refresh()
  }

  const others = sessions.filter((s) => s.sid !== currentSid)

  return (
    <div className="yop-page">
      <div className="yop-page__head">
        <div>
          <h1>{t.securityTitle}</h1>
          <p className="yop-lead">{t.securityLead}</p>
        </div>
      </div>

      {message && (
        <Notice tone={message.tone} live>
          {message.text}
        </Notice>
      )}

      <div className="yop-grid yop-grid--main">
        <section className="yop-card" aria-labelledby="yop-mfa-title">
          <div className="yop-card__head">
            <h2 id="yop-mfa-title">{t.twoFactor}</h2>
            <span className="yop-pill yop-pill--good">
              <Icon name="check" />
              {t.twoFactorOn}
            </span>
          </div>
          <dl className="yop-facts">
            <div>
              <dt>{t.activeSince}</dt>
              <dd>{enabledAt ? formatDate(enabledAt, lang) : '—'}</dd>
            </div>
            <div>
              <dt>{t.recoveryCodes}</dt>
              <dd>{recoveryLeft} / 10</dd>
            </div>
          </dl>
          {recoveryLeft <= 3 && <Notice tone="warning">{t.recoveryLow}</Notice>}
          {codes ? (
            <div className="yop-codes-box">
              <p>{t.recoveryLead}</p>
              <ul className="yop-codes" dir="ltr">
                {codes.map((code) => (
                  <li key={code}>
                    <code>{code}</code>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="yop-row">
              <button type="button" className="yop-button" onClick={regenerate} disabled={busy}>
                <Icon name="key" />
                {t.newRecoveryCodes}
              </button>
              <span className="yop-hint">{t.newRecoveryWarning}</span>
            </div>
          )}
          <p className="yop-hint yop-hint--block">{t.recoveryHelp}</p>
        </section>

        <section className="yop-card" aria-labelledby="yop-events-title">
          <div className="yop-card__head">
            <h2 id="yop-events-title">{t.events}</h2>
          </div>
          {events.length ? (
            <ol className="yop-timeline">
              {events.map((event) => (
                <li
                  key={event.id}
                  className={event.failed ? 'yop-timeline__item--warn' : undefined}
                >
                  <span className="yop-timeline__title">{event.label}</span>
                  <span className="yop-list__meta">
                    <bdi>{event.when}</bdi>
                    {event.detail ? (
                      <>
                        {' · '}
                        <bdi>{event.detail}</bdi>
                      </>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="yop-empty">{t.nothingYet}</p>
          )}
        </section>
      </div>

      <section className="yop-card" aria-labelledby="yop-sessions-title">
        <div className="yop-card__head">
          <h2 id="yop-sessions-title">{t.sessions}</h2>
          {others.length > 0 && (
            <button
              type="button"
              className="yop-button yop-button--small yop-card__more"
              onClick={revokeOthers}
              disabled={busy}
            >
              <Icon name="logout" />
              {t.signOutOthers}
            </button>
          )}
        </div>
        <div className="yop-table-wrap">
          <table className="yop-table">
            <thead>
              <tr>
                <th scope="col">{t.device}</th>
                <th scope="col">{t.started}</th>
                <th scope="col">{t.lastActive}</th>
                <th scope="col">
                  <span className="yop-visually-hidden">{t.signOut}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.sid}>
                  <td>
                    <span className="yop-device">
                      <Icon name={deviceIcon(session.deviceClass)} />
                      <span>
                        <bdi>{deviceName(session)}</bdi>
                        {session.sid === currentSid && (
                          <span className="yop-pill yop-pill--info">{t.thisDevice}</span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td>
                    <bdi>{session.started}</bdi>
                  </td>
                  <td>
                    <bdi>{session.lastSeen}</bdi>
                  </td>
                  <td className="yop-table__action">
                    {session.sid !== currentSid && (
                      <button
                        type="button"
                        className="yop-button yop-button--small yop-button--ghost"
                        onClick={() => revoke(session.sid)}
                        disabled={busy}
                      >
                        {t.signOut}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {others.length === 0 && <p className="yop-hint yop-hint--block">{t.noOtherSessions}</p>}
      </section>

      <section className="yop-card" aria-labelledby="yop-devices-title">
        <div className="yop-card__head">
          <h2 id="yop-devices-title">{t.devices}</h2>
          <span className="yop-card__sub">{t.devicesHint}</span>
        </div>
        <ul className="yop-list">
          {devices.map((device) => (
            <li key={device.id}>
              <span className="yop-device">
                <Icon name={deviceIcon(device.deviceClass)} />
                <span>
                  <bdi className="yop-list__title">{deviceName(device)}</bdi>
                  <span className="yop-list__meta">
                    {t.lastActive}: <bdi>{device.lastSeen}</bdi>
                  </span>
                </span>
              </span>
              {device.current ? (
                <span className="yop-pill yop-pill--info">{t.thisDevice}</span>
              ) : (
                <button
                  type="button"
                  className="yop-button yop-button--small yop-button--ghost"
                  onClick={() => forget(device.id)}
                  disabled={busy}
                >
                  {t.forget}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <StepUpDialog
        open={Boolean(stepUpFor)}
        onClose={() => setStepUpFor(null)}
        onConfirmed={() => {
          const retry = stepUpFor
          setStepUpFor(null)
          void retry?.()
        }}
      />
    </div>
  )
}
