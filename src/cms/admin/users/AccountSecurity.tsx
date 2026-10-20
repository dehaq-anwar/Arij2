'use client'

import { useAuth, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import Link from 'next/link'
import { useState } from 'react'

import { can, LIMITED_ROLES, type PermissionSubject, type Role } from '../../access/permissions'
import {
  fill,
  Notice,
  postAccount,
  StepUpDialog,
  useAdminText,
  useStepUpCountdown,
} from '../client'
import { Icon } from '../icons'

/**
 * Sidebar of an account in the admin: the security confirmation needed before sensitive changes
 * are saved, and — for people who may manage this account — its two-factor status with "reset
 * two-factor" and "end all sessions". The server checks every rule again.
 */
export function AccountSecurity() {
  const { t } = useAdminText()
  const { user } = useAuth()
  const { id } = useDocumentInfo()
  const mfaEnabled = useFormFields(([fields]) => fields.mfaEnabled?.value) as boolean | undefined
  const role = useFormFields(([fields]) => fields.role?.value) as Role | undefined
  const [stepUpOpen, setStepUpOpen] = useState(false)
  const [validUntil, setValidUntil] = useState<number | null>(null)
  const [pending, setPending] = useState<null | 'reset-mfa' | 'end-sessions'>(null)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const minutes = useStepUpCountdown(validUntil)

  const actor = user as unknown as (PermissionSubject & { id: number }) | null
  const self = Boolean(actor && id && String(actor.id) === String(id))
  const manages =
    can(actor, 'users.manage') ||
    (can(actor, 'users.manageLimited') && (!id || (role ? LIMITED_ROLES.includes(role) : false)))
  const mayManageTarget = Boolean(id) && !self && manages

  async function act(action: 'reset-mfa' | 'end-sessions', confirmed = false) {
    const question = action === 'reset-mfa' ? t.resetMfaConfirm : t.endSessionsConfirm
    if (!confirmed && !window.confirm(question)) return
    setMessage(null)
    const { status, data } = await postAccount(`/security/${id}/${action}`)
    if (status === 403 && data.error === 'step_up_required') {
      setPending(action)
      setStepUpOpen(true)
      return
    }
    setMessage(
      status === 200
        ? { tone: 'success', text: t.done }
        : { tone: 'error', text: status === 403 ? t.notAllowed : t.genericError },
    )
  }

  if (!actor || (!self && !manages)) return null

  return (
    <div className="yop-account-security">
      <h3 className="yop-account-security__title">
        <Icon name="shield" />
        {t.securityConfirmation}
      </h3>
      <p className="yop-hint">{t.stepUpNeeded}</p>
      {minutes ? (
        <p className="yop-pill yop-pill--good">
          <Icon name="check" />
          {fill(t.stepUpActive, { min: minutes })}
        </p>
      ) : (
        <button
          type="button"
          className="yop-button yop-button--small"
          onClick={() => setStepUpOpen(true)}
        >
          <Icon name="lock" />
          {t.confirmWithCode}
        </button>
      )}

      {mayManageTarget && (
        <>
          <h3 className="yop-account-security__title">{t.accountSecurity}</h3>
          <p className={`yop-pill ${mfaEnabled ? 'yop-pill--good' : 'yop-pill--warning'}`}>
            <Icon name={mfaEnabled ? 'check' : 'clock'} />
            {mfaEnabled ? t.mfaSetUp : t.mfaPending}
          </p>
          <div className="yop-stack">
            {mfaEnabled && (
              <button
                type="button"
                className="yop-button yop-button--small yop-button--danger"
                onClick={() => act('reset-mfa')}
              >
                {t.resetMfa}
              </button>
            )}
            <button
              type="button"
              className="yop-button yop-button--small"
              onClick={() => act('end-sessions')}
            >
              {t.endSessions}
            </button>
          </div>
        </>
      )}
      {self && (
        <p className="yop-hint">
          {t.ownAccountHint}{' '}
          <Link href="/admin/security" prefetch={false}>
            {t.mySecurity}
          </Link>
        </p>
      )}
      {message && (
        <Notice tone={message.tone} live>
          {message.text}
        </Notice>
      )}

      <StepUpDialog
        open={stepUpOpen}
        onClose={() => setStepUpOpen(false)}
        onConfirmed={() => {
          setValidUntil(Date.now() + 5 * 60 * 1000)
          const retry = pending
          setPending(null)
          if (retry) void act(retry, true)
        }}
      />
    </div>
  )
}
