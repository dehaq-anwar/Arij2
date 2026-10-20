import type { Payload, TaskConfig } from 'payload'

import { SESSION_MAX_AGE_MS } from '../auth/session-state'

const DAY = 24 * 60 * 60 * 1000
/** Ended sign-in records stay this long for the security screen (proposal, adjustable). */
export const ENDED_SESSION_DAYS = 30

/**
 * Housekeeping for sign-in records: pending sign-ins that were never completed, sessions past
 * their maximum age, and ended sessions after ENDED_SESSION_DAYS. Security events themselves
 * are in the audit log and are not touched here.
 */
export async function cleanUpSessions(payload: Payload, now = new Date()) {
  const options = { overrideAccess: true, depth: 0 } as const
  const expired = await payload.update({
    collection: 'auth-sessions',
    where: {
      or: [
        {
          and: [{ status: { equals: 'pending' } }, { expiresAt: { less_than: now.toISOString() } }],
        },
        {
          and: [
            { status: { equals: 'active' } },
            {
              createdAt: { less_than: new Date(now.getTime() - SESSION_MAX_AGE_MS).toISOString() },
            },
          ],
        },
      ],
    },
    data: {
      status: 'ended',
      endedAt: now.toISOString(),
      endReason: 'expired',
      enrollmentSecret: null,
    },
    ...options,
  })
  const removed = await payload.delete({
    collection: 'auth-sessions',
    where: {
      and: [
        { status: { equals: 'ended' } },
        {
          endedAt: { less_than: new Date(now.getTime() - ENDED_SESSION_DAYS * DAY).toISOString() },
        },
      ],
    },
    ...options,
  })
  return { expired: expired.docs.length, removed: removed.docs.length }
}

export const authCleanupTask: TaskConfig = {
  slug: 'auth-cleanup',
  label: 'Clean up sign-in records',
  schedule: [{ cron: '15 * * * *', queue: 'maintenance' }],
  retries: 2,
  outputSchema: [
    { name: 'expired', type: 'number' },
    { name: 'removed', type: 'number' },
  ],
  handler: async ({ req }) => ({ output: await cleanUpSessions(req.payload) }),
}
