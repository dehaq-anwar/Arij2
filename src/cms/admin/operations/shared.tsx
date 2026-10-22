import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps, PayloadRequest } from 'payload'
import type { ReactNode } from 'react'

import { can, type Permission, type PermissionSubject } from '../../access/permissions'
import { currentSession } from '../../auth/session-state'
import type { OperationsState } from '../../operations/collect'
import { adminLanguage, adminTexts, fill, formatDateTime, type AdminLanguage } from '../i18n'
import { Icon, type IconName } from '../icons'
import { opsTexts, type OpsTexts } from './texts'

export type OpsContext = {
  req: PayloadRequest
  person: PermissionSubject & { id: number; name?: string; role?: string }
  language: AdminLanguage
  t: (typeof adminTexts)['de']
  o: OpsTexts
}

/**
 * Payload renders custom views without checking the sign-in, so every operations view checks it
 * here (and the permission); the endpoints check everything again.
 */
export async function opsContext(props: AdminViewServerProps, path: string): Promise<OpsContext> {
  const { req } = props.initPageResult
  const session = req.user ? await currentSession(req) : null
  if (!req.user || !session) redirect(`/admin/login?redirect=${encodeURIComponent(path)}`)
  const language = adminLanguage(req.i18n?.language)
  return {
    req,
    person: req.user as unknown as OpsContext['person'],
    language,
    t: adminTexts[language],
    o: opsTexts[language],
  }
}

export function OpsTemplate({
  props,
  children,
}: {
  props: AdminViewServerProps
  children: ReactNode
}) {
  const { initPageResult, params, searchParams } = props
  const { req } = initPageResult
  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={req.payload}
      permissions={initPageResult.permissions}
      req={req}
      searchParams={searchParams}
      user={req.user ?? undefined}
      viewActions={req.payload.config.admin?.components?.actions}
      visibleEntities={initPageResult.visibleEntities}
    >
      {children}
    </DefaultTemplate>
  )
}

export function PageHead({
  eyebrow,
  title,
  lead,
  icon,
  actions,
}: {
  eyebrow: string
  title: string
  lead: string
  icon: IconName
  actions?: ReactNode
}) {
  return (
    <div className="yop-page__head">
      <div className="yop-page__title">
        <span className="yop-page__icon">
          <Icon name={icon} />
        </span>
        <div>
          <p className="yop-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="yop-lead">{lead}</p>
        </div>
      </div>
      {actions ? <div className="yop-page__actions">{actions}</div> : null}
    </div>
  )
}

export type Tone = 'good' | 'warning' | 'bad' | 'neutral'

const TONE_ICON: Record<Tone, IconName> = {
  good: 'check',
  warning: 'alert',
  bad: 'alert',
  neutral: 'info',
}

/** Status in colour, always with an icon and a word (never colour alone). */
export function StatePill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`yop-pill yop-pill--${tone === 'bad' ? 'bad' : tone}`}>
      <Icon name={TONE_ICON[tone]} />
      {children}
    </span>
  )
}

export function NotAllowed({ o }: { o: OpsTexts }) {
  return (
    <div className="yop-page">
      <div className="yop-notice yop-notice--warning" role="status">
        <Icon name="lock" />
        <div>{o.notAllowed}</div>
      </div>
    </div>
  )
}

/** Why live data is missing: no agent configured, or the agent does not answer. */
export function AgentNotice({
  configured,
  reachable,
  state,
  o,
  language,
}: {
  configured: boolean
  reachable: boolean
  state: OperationsState
  o: OpsTexts
  language: AdminLanguage
}) {
  if (!configured) {
    return (
      <div className="yop-notice yop-notice--info yop-ops-notice" role="status">
        <Icon name="info" />
        <div>
          <strong>{o.agentMissingTitle}</strong>
          <p>{o.agentMissingBody}</p>
        </div>
      </div>
    )
  }
  if (reachable) return null
  return (
    <div className="yop-notice yop-notice--warning yop-ops-notice" role="status">
      <Icon name="alert" />
      <div>
        <strong>{o.agentDownTitle}</strong>
        <p>
          {state.lastContactAt
            ? fill(o.agentDownBody, { time: formatDateTime(state.lastContactAt, language) })
            : o.agentNeverBody}
        </p>
      </div>
    </div>
  )
}

export const allowedTo = (ctx: OpsContext, permission: Permission) => can(ctx.person, permission)
