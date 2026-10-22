import type { Payload, PayloadRequest } from 'payload'

import { can, type Permission, type PermissionSubject } from '../access/permissions'
import { OPERATIONS_ALERTS } from '../operations/alerts'

/**
 * In-app notifications (the bell in the Control Center's header). They carry no personal data:
 * a kind, a reference to the record (type and id) and the admin link. The text is chosen by the
 * interface in the reader's language; names appear only after opening the record, where the
 * access rules apply again.
 */
export const NOTIFICATION_KINDS = [
  'newApplication',
  'newMessage',
  'assigned',
  'followUpDue',
  'applicationWaiting',
  'consentPending',
  'exportCreated',
  'memberDeleted',
  'newDevice',
  'memberReviewDue',
  'memberReduced',
  // Operations (src/cms/operations/alerts.ts) and e-mail delivery (src/cms/email.ts).
  ...OPERATIONS_ALERTS,
  'emailFailed',
] as const
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]

export const NOTIFICATION_SUBJECTS = [
  'membership-applications',
  'members',
  'contact-messages',
  'exports',
  'security',
  'operations',
] as const
export type NotificationSubject = (typeof NOTIFICATION_SUBJECTS)[number]

type Account = PermissionSubject & { id: number }

/** Active accounts whose role (minus restrictions) includes the permission. */
export async function recipientsWith(
  payload: Payload,
  permission: Permission,
  req?: PayloadRequest,
): Promise<number[]> {
  const { docs } = await payload.find({
    collection: 'users',
    where: { disabled: { not_equals: true } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
    select: { role: true, restrictions: true, disabled: true },
    ...(req ? { req } : {}),
  })
  return (docs as unknown as Account[]).filter((user) => can(user, permission)).map((u) => u.id)
}

export type NotificationInput = {
  kind: NotificationKind
  recipients: number[]
  subjectType: NotificationSubject
  subjectId?: number | string | null
  href: string
  /** Skip recipients who already have such a notice: still unread, or from the last 20 hours. */
  dedupe?: 'unread' | 'day'
}

export async function notify(payload: Payload, input: NotificationInput, req?: PayloadRequest) {
  const recipients = [...new Set(input.recipients)]
  if (!recipients.length) return 0
  const subjectId = input.subjectId == null ? null : String(input.subjectId)
  let skip = new Set<number>()
  if (input.dedupe) {
    const { docs } = await payload.find({
      collection: 'notifications',
      where: {
        and: [
          { recipient: { in: recipients } },
          { kind: { equals: input.kind } },
          subjectId ? { subjectId: { equals: subjectId } } : { subjectId: { exists: false } },
          input.dedupe === 'unread'
            ? { readAt: { exists: false } }
            : {
                createdAt: {
                  greater_than: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
                },
              },
        ],
      },
      limit: recipients.length * 2,
      depth: 0,
      overrideAccess: true,
      ...(req ? { req } : {}),
    })
    skip = new Set(
      docs.map((doc) =>
        Number(typeof doc.recipient === 'object' ? doc.recipient?.id : doc.recipient),
      ),
    )
  }
  let created = 0
  for (const recipient of recipients) {
    if (skip.has(recipient)) continue
    try {
      await payload.create({
        collection: 'notifications',
        data: {
          recipient,
          kind: input.kind,
          subjectType: input.subjectType,
          subjectId,
          href: input.href,
        },
        overrideAccess: true,
        depth: 0,
        ...(req ? { req } : {}),
      })
      created++
    } catch (error) {
      payload.logger.error({ err: error, kind: input.kind }, 'Could not create a notification')
    }
  }
  return created
}

/** Relative admin links, so they work on whichever host the Control Center runs. */
export const adminHref = (collection: string, id?: number | string | null) =>
  id == null ? `/admin/collections/${collection}` : `/admin/collections/${collection}/${id}`
