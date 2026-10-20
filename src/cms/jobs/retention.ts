import type { Payload, TaskConfig } from 'payload'

/** Retention period decided by the association (plan §18, Q7). */
export const RETENTION_MONTHS = 6

/** The same calendar day six months earlier (end-of-month days roll back, never forward). */
export const retentionCutoff = (now: Date): Date => monthsBefore(now, RETENTION_MONTHS)

/** The same calendar day `months` months earlier (end-of-month days roll back, never forward). */
export function monthsBefore(now: Date, months: number): Date {
  const cutoff = new Date(now)
  const day = cutoff.getUTCDate()
  cutoff.setUTCDate(1)
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months)
  const lastDay = new Date(
    Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0),
  ).getUTCDate()
  cutoff.setUTCDate(Math.min(day, lastDay))
  return cutoff
}

/**
 * Deletes contact messages six months after they arrived, rejected membership applications six
 * months after the decision, and expired rate-limit counters. Accepted applications are member
 * records and stay; undecided ones wait for the board's decision.
 */
export async function applyRetention(payload: Payload, now = new Date()) {
  const cutoff = retentionCutoff(now).toISOString()
  const options = { overrideAccess: true, depth: 0 } as const
  const contactMessages = await payload.delete({
    collection: 'contact-messages',
    where: { createdAt: { less_than: cutoff } },
    ...options,
  })
  const applications = await payload.delete({
    collection: 'membership-applications',
    where: { and: [{ status: { equals: 'rejected' } }, { decisionDate: { less_than: cutoff } }] },
    ...options,
  })
  const rateLimitBuckets = await payload.delete({
    collection: 'rate-limit-buckets',
    where: { expiresAt: { less_than: now.toISOString() } },
    ...options,
  })
  return {
    contactMessages: contactMessages.docs.length,
    rejectedApplications: applications.docs.length,
    rateLimitBuckets: rateLimitBuckets.docs.length,
  }
}

/** Runs every night at 03:00 (server time) through Payload's job queue. */
export const retentionTask: TaskConfig = {
  slug: 'retention',
  label: 'Delete expired submissions',
  schedule: [{ cron: '0 3 * * *', queue: 'maintenance' }],
  retries: 2,
  outputSchema: [
    { name: 'contactMessages', type: 'number' },
    { name: 'rejectedApplications', type: 'number' },
    { name: 'rateLimitBuckets', type: 'number' },
  ],
  handler: async ({ req }) => {
    const output = await applyRetention(req.payload)
    req.payload.logger.info({ ...output }, 'Retention: expired submissions deleted')
    return { output }
  },
}
