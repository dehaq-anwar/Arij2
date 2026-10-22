import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload, PayloadRequest, TaskConfig } from 'payload'

import { agentRead, agentSetup, type AgentSetup, type HourStats } from '../operations/agent'
import { readOperationsState, writeOperationsState } from '../operations/collect'

const HOUR = 3_600_000
/** The agent keeps raw access logs 7 days; one request covers at most 8 days. */
const MAX_BACK = 7 * 24 * HOUR

export const startOfHour = (date: Date) => new Date(Math.floor(date.getTime() / HOUR) * HOUR)

/**
 * Hourly (task `analytics-collect`): asks the agent for the complete hours since the last run
 * (at most the 7 days it keeps) and stores one entry per hour. An hour counted again replaces
 * its entry, so a repeated run never counts twice.
 */
export async function collectAnalytics(
  payload: Payload,
  {
    now = new Date(),
    setup = agentSetup(),
    req,
  }: { now?: Date; setup?: AgentSetup; req?: PayloadRequest } = {},
): Promise<{ configured: boolean; hours: number }> {
  if (!setup) return { configured: false, hours: 0 }
  const state = await readOperationsState(payload, req)
  const until = startOfHour(now)
  const earliest = new Date(until.getTime() - MAX_BACK)
  const last = state.accessCollectedUntil ? new Date(state.accessCollectedUntil) : null
  const since = last && last > earliest ? last : earliest
  if (since >= until) return { configured: true, hours: 0 }
  const { hours } = await agentRead(
    '/v1/access',
    { since: since.toISOString(), until: until.toISOString() },
    { setup, timeoutMs: 60_000 },
  )
  for (const hour of hours) await storeHour(payload, hour)
  await writeOperationsState(payload, { accessCollectedUntil: until.toISOString() }, req)
  return { configured: true, hours: hours.length }
}

/**
 * One statement per hour: inserted, or replaced if the hour is already there. Atomic, so a
 * scheduled run and a "run now" at the same moment cannot both insert the same hour.
 */
async function storeHour(payload: Payload, hour: HourStats) {
  const db = (payload.db as unknown as PostgresAdapter).drizzle
  const json = (value: unknown) => JSON.stringify(value ?? [])
  await db.execute(sql`
    insert into access_stats (hour, requests, views, entrances, bots, not_found, server_errors,
      pages, referrers, not_found_paths, errors)
    values (${hour.hour}, ${hour.requests}, ${hour.views}, ${hour.entrances}, ${hour.bots},
      ${hour.notFound}, ${hour.serverErrors}, ${json(hour.pages)}::jsonb,
      ${json(hour.referrers)}::jsonb, ${json(hour.notFoundPaths)}::jsonb,
      ${json(hour.errors)}::jsonb)
    on conflict (hour) do update set
      requests = excluded.requests, views = excluded.views, entrances = excluded.entrances,
      bots = excluded.bots, not_found = excluded.not_found,
      server_errors = excluded.server_errors, pages = excluded.pages,
      referrers = excluded.referrers, not_found_paths = excluded.not_found_paths,
      errors = excluded.errors
  `)
}

export const analyticsCollectTask: TaskConfig = {
  slug: 'analytics-collect',
  label: 'Count visitor statistics from the access log',
  // Every hour, shortly after the hour is complete.
  schedule: [{ cron: '7 * * * *', queue: 'operations' }],
  retries: 1,
  outputSchema: [
    { name: 'configured', type: 'checkbox' },
    { name: 'hours', type: 'number' },
  ],
  handler: async ({ req }) => ({ output: await collectAnalytics(req.payload, { req }) }),
}
