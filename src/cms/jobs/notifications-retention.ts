import type { Payload, PayloadRequest, TaskConfig, Where } from 'payload'

const DAY = 24 * 60 * 60 * 1000
/** Decided by the association (2026-10-20): read notifications 30 days, unread ones 90 days. */
export const READ_NOTIFICATION_DAYS = 30
export const UNREAD_NOTIFICATION_DAYS = 90

/**
 * Which notifications are old enough to go. Notifications are reminders, not records: what they
 * point to (the application, the export, the sign-in from a new device) is in its own collection
 * and in the audit log, which keeps its own retention period.
 */
export function notificationRetentionWhere(now = new Date()): Where {
  return {
    or: [
      {
        readAt: { less_than: new Date(now.getTime() - READ_NOTIFICATION_DAYS * DAY).toISOString() },
      },
      {
        and: [
          { readAt: { exists: false } },
          {
            createdAt: {
              less_than: new Date(now.getTime() - UNREAD_NOTIFICATION_DAYS * DAY).toISOString(),
            },
          },
        ],
      },
    ],
  }
}

export async function purgeNotifications(payload: Payload, now = new Date(), req?: PayloadRequest) {
  const removed = await payload.delete({
    collection: 'notifications',
    where: notificationRetentionWhere(now),
    overrideAccess: true,
    depth: 0,
    req,
  })
  return { removed: removed.docs.length }
}

export const notificationsRetentionTask: TaskConfig = {
  slug: 'notifications-retention',
  label: 'Delete old notifications',
  schedule: [{ cron: '45 3 * * *', queue: 'maintenance' }],
  retries: 2,
  outputSchema: [{ name: 'removed', type: 'number' }],
  handler: async ({ req }) => ({ output: await purgeNotifications(req.payload, new Date(), req) }),
}
