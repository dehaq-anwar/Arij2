import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'

/** A signed-in session ends after this long, however active it is (sign in again). */
export const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000
/** How often the "last activity" of a session is written at most. */
const LAST_SEEN_INTERVAL_MS = 5 * 60 * 1000

export type SessionUser = { id: number | string; _sid?: string; collection?: string }

type SessionRecord = {
  id: number
  sid: string
  user: number | { id: number } | null
  status: 'pending' | 'active' | 'ended'
  createdAt: string
  stepUpAt?: string | null
  lastSeenAt?: string | null
  deviceHash?: string | null
}

const CACHE_KEY = 'yop.currentSession'

const userIdOf = (record: SessionRecord) =>
  typeof record.user === 'object' && record.user ? record.user.id : record.user

/**
 * The second line of defence behind the pending-session mechanism (src/cms/auth/login.ts):
 * Payload accepts a token whenever its session id is in the account's session list. Here a
 * request only counts as signed in if our own record of that session says it was completed
 * with the second factor, belongs to this account and is younger than SESSION_MAX_AGE_MS.
 * Looked up once per request.
 */
export async function currentSession(req: PayloadRequest): Promise<SessionRecord | null> {
  const user = req.user as SessionUser | null | undefined
  if (!user?._sid || user.collection !== 'users') return null
  const cache = req.context as Record<string, unknown>
  const cached = cache[CACHE_KEY] as { sid: string; record: SessionRecord | null } | undefined
  if (cached?.sid === user._sid) return cached.record

  const { docs } = await req.payload.find({
    collection: 'auth-sessions',
    where: { sid: { equals: user._sid }, status: { equals: 'active' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  let record = (docs[0] as SessionRecord | undefined) ?? null
  if (record) {
    const tooOld = Date.now() - new Date(record.createdAt).getTime() > SESSION_MAX_AGE_MS
    if (tooOld || String(userIdOf(record)) !== String(user.id)) record = null
  }
  cache[CACHE_KEY] = { sid: user._sid, record }
  if (record) touch(req, record)
  return record
}

export const isVerifiedSession = async (req: PayloadRequest) => Boolean(await currentSession(req))

/** Sessions whose activity this process wrote recently (avoids a write per request). */
const touched = new Map<string, number>()

/**
 * Writes "last activity" now and then. One conditional statement, outside any transaction and
 * without loading the session: parallel requests of the same person must not queue up behind
 * each other (a full Payload update here locked the row and could exhaust the pool).
 */
function touch(req: PayloadRequest, record: SessionRecord) {
  const now = Date.now()
  const last = Math.max(
    record.lastSeenAt ? new Date(record.lastSeenAt).getTime() : 0,
    touched.get(record.sid) ?? 0,
  )
  if (now - last < LAST_SEEN_INTERVAL_MS) return
  touched.set(record.sid, now)
  if (touched.size > 5000) touched.clear()
  const { drizzle } = req.payload.db as unknown as PostgresAdapter
  const since = new Date(now - LAST_SEEN_INTERVAL_MS).toISOString()
  drizzle
    .execute(
      sql`update auth_sessions set last_seen_at = ${new Date(now).toISOString()}
        where id = ${record.id} and (last_seen_at is null or last_seen_at < ${since})`,
    )
    .catch((error: unknown) =>
      req.payload.logger.warn({ err: error }, 'Could not record session activity'),
    )
}

/** Sensitive actions need the second factor again within this time (docs §3.3). */
export const STEP_UP_WINDOW_MS = 5 * 60 * 1000

export async function hasFreshStepUp(req: PayloadRequest): Promise<boolean> {
  const record = await currentSession(req)
  if (!record?.stepUpAt) return false
  return Date.now() - new Date(record.stepUpAt).getTime() <= STEP_UP_WINDOW_MS
}
