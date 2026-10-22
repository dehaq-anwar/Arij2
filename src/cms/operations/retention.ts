import type { CollectionSlug, Payload, PayloadRequest, TaskConfig } from 'payload'

import { EMAIL_LOG_DAYS } from '../mail/log'

const DAY = 24 * 60 * 60 * 1000

/**
 * How long operations data is kept (proposals, docs/CONTROL-CENTER.md §17): host samples 30 days,
 * backup/drill/restart history 12 months (like the audit log), e-mail delivery log 90 days,
 * finished jobs 30 days. None of it holds personal data except the shortened recipients of the
 * delivery log.
 */
export const OPERATIONS_RETENTION = {
  samplesDays: 30,
  eventsDays: 365,
  emailLogDays: EMAIL_LOG_DAYS,
  jobsDays: 30,
  /** Hourly visitor counts (no personal data): 13 months, so a year compares with the last. */
  accessStatsDays: 400,
} as const

export async function purgeOperations(payload: Payload, now = new Date(), req?: PayloadRequest) {
  const before = (days: number) => new Date(now.getTime() - days * DAY).toISOString()
  const run = async (collection: CollectionSlug, where: Record<string, unknown>) => {
    const { totalDocs } = await payload.count({
      collection,
      where: where as never,
      overrideAccess: true,
      ...(req ? { req } : {}),
    })
    if (totalDocs) {
      await payload.db.deleteMany({ collection, where: where as never, ...(req ? { req } : {}) })
    }
    return totalDocs
  }
  return {
    samples: await run('ops-samples', {
      at: { less_than: before(OPERATIONS_RETENTION.samplesDays) },
    }),
    events: await run('ops-events', {
      startedAt: { less_than: before(OPERATIONS_RETENTION.eventsDays) },
    }),
    emailLog: await run('email-log', {
      createdAt: { less_than: before(OPERATIONS_RETENTION.emailLogDays) },
    }),
    accessStats: await run('access-stats', {
      hour: { less_than: before(OPERATIONS_RETENTION.accessStatsDays) },
    }),
    jobs: await run('payload-jobs', {
      completedAt: { less_than: before(OPERATIONS_RETENTION.jobsDays) },
    }),
  }
}

export const opsRetentionTask: TaskConfig = {
  slug: 'ops-retention',
  label: 'Delete old operations data',
  schedule: [{ cron: '50 3 * * *', queue: 'maintenance' }],
  retries: 2,
  outputSchema: [
    { name: 'samples', type: 'number' },
    { name: 'events', type: 'number' },
    { name: 'emailLog', type: 'number' },
    { name: 'accessStats', type: 'number' },
    { name: 'jobs', type: 'number' },
  ],
  handler: async ({ req }) => ({ output: await purgeOperations(req.payload, new Date(), req) }),
}
