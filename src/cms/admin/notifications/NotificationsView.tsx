import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'

import { currentSession } from '../../auth/session-state'
import { NotificationsClient } from './NotificationsClient'

/** All notifications of the signed-in person (the bell shows the latest few). */
export async function NotificationsView(props: AdminViewServerProps) {
  const { initPageResult, params, searchParams } = props
  const { req } = initPageResult
  const session = req.user ? await currentSession(req) : null
  if (!req.user || !session) redirect('/admin/login?redirect=%2Fadmin%2Fnotifications')
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
      // The header actions (the notification bell), as Payload passes them to its own views.
      viewActions={req.payload.config.admin?.components?.actions}
      visibleEntities={initPageResult.visibleEntities}
    >
      <NotificationsClient />
    </DefaultTemplate>
  )
}
