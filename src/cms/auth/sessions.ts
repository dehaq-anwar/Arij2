import type { Payload, PayloadRequest } from 'payload'

import { describeDevice } from './device'

/** After the password, the second factor must follow within this time. */
export const PENDING_TTL_MS = 10 * 60 * 1000
/** Wrong codes allowed per sign-in before the password must be entered again. */
export const MAX_ATTEMPTS_PER_SIGN_IN = 5

export type AuthSession = {
  id: number
  sid: string
  user: number | { id: number }
  status: 'pending' | 'active' | 'ended'
  expiresAt: string
  attempts?: number | null
  enrollmentSecret?: string | null
  verifiedAt?: string | null
  method?: 'totp' | 'recovery' | 'enrollment' | null
  stepUpAt?: string | null
  lastSeenAt?: string | null
  browser?: string | null
  os?: string | null
  deviceClass?: string | null
  deviceHash?: string | null
  createdAt: string
}

type EndReason = 'logout' | 'revoked' | 'expired' | 'failed' | 'cancelled' | 'disabled' | 'mfaReset'

type PayloadSession = { id: string; createdAt?: string | Date | null; expiresAt: string | Date }
type UserRow = { id: number; sessions?: PayloadSession[] | null; updatedAt?: unknown }

/** A pending sign-in is usable until its deadline (checked again by every endpoint). */
export const isPendingUsable = (session: Pick<AuthSession, 'expiresAt'>) =>
  new Date(session.expiresAt).getTime() > Date.now()

export const userIdOf = (session: Pick<AuthSession, 'user'>) =>
  typeof session.user === 'object' ? session.user.id : session.user

/** The session id inside a token Payload has just signed (no verification needed here). */
export function sidOfToken(token: string): string | null {
  try {
    const claims = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString())
    return typeof claims.sid === 'string' ? claims.sid : null
  } catch {
    return null
  }
}

/**
 * Payload's list of valid sessions lives in the account; changing it means writing the account
 * back the way Payload itself does (whole row, updatedAt untouched).
 */
async function updatePayloadSessions(
  payload: Payload,
  userId: number,
  change: (sessions: PayloadSession[]) => PayloadSession[],
  req?: PayloadRequest,
) {
  const user = (await payload.db.findOne({
    collection: 'users',
    where: { id: { equals: userId } },
    ...(req ? { req } : {}),
  })) as UserRow | null
  if (!user) return
  const now = Date.now()
  const valid = (user.sessions ?? []).filter((s) => new Date(s.expiresAt).getTime() > now)
  user.sessions = change(valid)
  user.updatedAt = null
  await payload.db.updateOne({
    collection: 'users',
    id: userId,
    data: user,
    returning: false,
    ...(req ? { req } : {}),
  })
}

/**
 * Called right after Payload accepted the password (also after a password reset): the session
 * Payload just created is taken out of the account's list of valid sessions — so the token in
 * the response is not accepted anywhere, not by the admin, the REST API or anything else — and
 * recorded as pending. Only the second factor puts it back (activateSession).
 */
export async function holdSession(req: PayloadRequest, userId: number, sid: string) {
  await updatePayloadSessions(req.payload, userId, (s) => s.filter((x) => x.id !== sid), req)
  const device = describeDevice(req.headers.get('user-agent'))
  await req.payload.create({
    collection: 'auth-sessions',
    data: {
      sid,
      user: userId,
      status: 'pending',
      expiresAt: new Date(Date.now() + PENDING_TTL_MS).toISOString(),
      attempts: 0,
      ...device,
    },
    overrideAccess: true,
    depth: 0,
    req,
  })
}

export async function findSession(
  payload: Payload,
  sid: string,
  status?: AuthSession['status'],
): Promise<AuthSession | null> {
  const { docs } = await payload.find({
    collection: 'auth-sessions',
    where: { sid: { equals: sid }, ...(status ? { status: { equals: status } } : {}) },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return (docs[0] as AuthSession | undefined) ?? null
}

/** Second factor given: the session becomes valid for Payload and for session-state.ts. */
export async function activateSession(
  payload: Payload,
  session: AuthSession,
  method: NonNullable<AuthSession['method']>,
  deviceHash: string | null,
) {
  const lifetime = (payload.collections.users.config.auth.tokenExpiration ?? 7200) * 1000
  const now = new Date()
  await updatePayloadSessions(payload, userIdOf(session), (sessions) => [
    ...sessions.filter((s) => s.id !== session.sid),
    { id: session.sid, createdAt: now, expiresAt: new Date(now.getTime() + lifetime) },
  ])
  await payload.update({
    collection: 'auth-sessions',
    id: session.id,
    data: {
      status: 'active',
      verifiedAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      method,
      enrollmentSecret: null,
      deviceHash,
      // The pending deadline no longer applies; Payload's own expiry and the maximum age do.
      expiresAt: new Date(now.getTime() + lifetime).toISOString(),
    },
    overrideAccess: true,
    depth: 0,
  })
}

export async function endSession(payload: Payload, session: AuthSession, reason: EndReason) {
  await updatePayloadSessions(payload, userIdOf(session), (s) =>
    s.filter((x) => x.id !== session.sid),
  )
  await payload.update({
    collection: 'auth-sessions',
    id: session.id,
    data: { status: 'ended', endedAt: new Date().toISOString(), endReason: reason },
    overrideAccess: true,
    depth: 0,
  })
}

/**
 * Ends every session of an account (all devices), optionally except one. Also clears sessions
 * Payload knows that have no record of ours (there should be none).
 */
export async function endAllSessions(
  payload: Payload,
  userId: number,
  reason: EndReason,
  exceptSid?: string,
  /** Inside a hook: the hook's request, so the writes join its transaction (no lock waits). */
  req?: PayloadRequest,
) {
  await updatePayloadSessions(payload, userId, (s) => s.filter((x) => x.id === exceptSid), req)
  await payload.update({
    collection: 'auth-sessions',
    where: {
      user: { equals: userId },
      status: { in: ['pending', 'active'] },
      ...(exceptSid ? { sid: { not_equals: exceptSid } } : {}),
    },
    data: { status: 'ended', endedAt: new Date().toISOString(), endReason: reason },
    overrideAccess: true,
    depth: 0,
    ...(req ? { req } : {}),
  })
}

/** The sessions shown on the security screen: active here and still valid for Payload. */
export async function listActiveSessions(payload: Payload, userId: number) {
  const user = (await payload.db.findOne({
    collection: 'users',
    where: { id: { equals: userId } },
  })) as UserRow | null
  const now = Date.now()
  const valid = new Set(
    (user?.sessions ?? []).filter((s) => new Date(s.expiresAt).getTime() > now).map((s) => s.id),
  )
  const { docs } = await payload.find({
    collection: 'auth-sessions',
    where: { user: { equals: userId }, status: { equals: 'active' } },
    sort: '-verifiedAt',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })
  return (docs as AuthSession[]).filter((s) => valid.has(s.sid))
}
