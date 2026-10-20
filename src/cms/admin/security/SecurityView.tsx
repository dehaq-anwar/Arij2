import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'

import { getCredential, unusedRecoveryCodes } from '../../auth/mfa'
import { currentSession } from '../../auth/session-state'
import { listActiveSessions } from '../../auth/sessions'
import { actionLabel } from '../audit/actions'
import { adminLanguage, formatDateTime } from '../i18n'
import { SecurityClient } from './SecurityClient'

/**
 * "My security": the signed-in person's second factor, sessions, devices and security events.
 * Payload renders custom views without checking the sign-in, so this view checks it itself.
 */
export async function SecurityView(props: AdminViewServerProps) {
  const { initPageResult, params, searchParams } = props
  const { req } = initPageResult
  const session = req.user ? await currentSession(req) : null
  if (!req.user || !session) redirect('/admin/login?redirect=%2Fadmin%2Fsecurity')
  const userId = req.user.id as number
  const language = adminLanguage(req.i18n?.language)

  const [credential, sessions, devices, events] = await Promise.all([
    getCredential(req.payload, userId),
    listActiveSessions(req.payload, userId),
    req.payload.find({
      collection: 'trusted-devices',
      where: { user: { equals: userId } },
      sort: '-lastSeenAt',
      limit: 20,
      depth: 0,
      overrideAccess: true,
    }),
    req.payload.find({
      collection: 'audit-log',
      where: { actorId: { equals: userId }, area: { equals: 'security' } },
      sort: '-createdAt',
      limit: 10,
      depth: 0,
      overrideAccess: true,
    }),
  ])

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={req.payload}
      permissions={initPageResult.permissions}
      req={req}
      searchParams={searchParams}
      user={req.user}
      visibleEntities={initPageResult.visibleEntities}
    >
      <SecurityClient
        enabledAt={credential?.enabledAt ?? null}
        recoveryLeft={credential ? unusedRecoveryCodes(credential) : 0}
        currentSid={session.sid}
        sessions={sessions.map((s) => ({
          sid: s.sid,
          browser: s.browser ?? null,
          os: s.os ?? null,
          deviceClass: s.deviceClass ?? null,
          started: formatDateTime(s.verifiedAt ?? s.createdAt, language),
          lastSeen: formatDateTime(s.lastSeenAt ?? s.verifiedAt, language),
        }))}
        devices={devices.docs.map((d) => ({
          id: d.id,
          browser: d.browser ?? null,
          os: d.os ?? null,
          deviceClass: d.deviceClass ?? null,
          lastSeen: formatDateTime(d.lastSeenAt ?? d.createdAt, language),
          current: d.deviceHash === session.deviceHash,
        }))}
        events={events.docs.map((e) => ({
          id: e.id,
          label: actionLabel(e.action, language),
          when: formatDateTime(e.createdAt, language),
          failed: e.result !== 'ok',
          detail: [
            (e.detail as { browser?: string } | null)?.browser,
            (e.detail as { os?: string } | null)?.os,
          ]
            .filter(Boolean)
            .join(', '),
        }))}
      />
    </DefaultTemplate>
  )
}
