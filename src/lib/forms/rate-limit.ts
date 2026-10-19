import { createHmac, randomBytes } from 'node:crypto'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

export type Limit = { name: string; seconds: number; max: number }

/** Plan §10: 5 per 10 minutes and 20 per day for each form; more room for signing in. */
export const LIMITS = {
  form: [
    { name: '10m', seconds: 600, max: 5 },
    { name: 'day', seconds: 86_400, max: 20 },
  ],
  login: [
    { name: '10m', seconds: 600, max: 20 },
    { name: 'day', seconds: 86_400, max: 100 },
  ],
} satisfies Record<string, Limit[]>

/**
 * The secret lives only in this process and is replaced every day (UTC). A stored key can
 * therefore never be traced back to an address, not even with access to the server's secrets.
 * A restart starts the counters afresh, which is acceptable for a single server.
 */
let salt = { day: '', value: Buffer.alloc(0) }
function dailySalt(now: Date) {
  const day = now.toISOString().slice(0, 10)
  if (salt.day !== day) salt = { day, value: randomBytes(32) }
  return salt.value
}

export const bucketKey = (scope: string, limit: string, address: string, now: Date) =>
  createHmac('sha256', dailySalt(now)).update(`${scope}|${limit}|${address}`).digest('base64url')

/**
 * The visitor's address as seen by our own reverse proxy: the last X-Forwarded-For entry.
 * (Earlier entries are whatever the client sent. The app itself is reachable only through the
 * proxy; without one, Next.js fills the header with the socket address.)
 */
export function clientAddress(headers: Pick<Headers, 'get'>): string {
  const entries = headers.get('x-forwarded-for')?.split(',') ?? []
  return (
    entries
      .map((e) => e.trim())
      .filter(Boolean)
      .at(-1) ?? 'unknown'
  )
}

/** Counts one attempt; false when any of the limits is exceeded. */
export async function allowAttempt(
  payload: Payload,
  scope: string,
  address: string,
  limits: Limit[],
  now = new Date(),
): Promise<boolean> {
  const { drizzle } = payload.db as unknown as PostgresAdapter
  let allowed = true
  for (const limit of limits) {
    const key = bucketKey(scope, limit.name, address, now)
    const expiresAt = new Date(now.getTime() + limit.seconds * 1000).toISOString()
    const nowIso = now.toISOString()
    // One atomic statement per window: concurrent requests cannot slip past the limit.
    const result = await drizzle.execute<{ count: string | number }>(sql`
      insert into rate_limit_buckets (key, count, expires_at)
      values (${key}, 1, ${expiresAt})
      on conflict (key) do update set
        count = case when rate_limit_buckets.expires_at <= ${nowIso}
          then 1 else rate_limit_buckets.count + 1 end,
        expires_at = case when rate_limit_buckets.expires_at <= ${nowIso}
          then excluded.expires_at else rate_limit_buckets.expires_at end
      returning count`)
    if (Number(result.rows[0]?.count) > limit.max) allowed = false
  }
  return allowed
}
