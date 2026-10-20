import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload, PayloadRequest } from 'payload'

import {
  decryptSecret,
  encryptSecret,
  hashRecoveryCode,
  newRecoveryCode,
  normalizeRecoveryCode,
  RECOVERY_CODE_COUNT,
  safeEqual,
} from './crypto'
import { verifyTotp } from './totp'

/** Wrong codes per account before the second factor is locked for LOCK_MS (all devices). */
export const MAX_FAILURES = 10
const FAILURE_WINDOW_MS = 15 * 60 * 1000
const LOCK_MS = 15 * 60 * 1000

export type Credential = {
  id: number
  user: number | { id: number }
  secret: string
  enabledAt: string
  lastStep: number
  failures?: number | null
  failuresSince?: string | null
  lockedUntil?: string | null
  recoveryCodes?: { id?: string | null; hash: string; usedAt?: string | null }[] | null
}

const accountOf = (credential: Credential) =>
  typeof credential.user === 'object' ? credential.user.id : credential.user

export async function getCredential(
  payload: Payload,
  userId: number | string,
  /** Inside a hook: the hook's request, so the read uses its database connection. */
  req?: PayloadRequest,
) {
  const { docs } = await payload.find({
    collection: 'auth-mfa',
    where: { user: { equals: userId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    ...(req ? { req } : {}),
  })
  return (docs[0] as Credential | undefined) ?? null
}

export const isLocked = (credential: Credential, now = Date.now()) =>
  Boolean(credential.lockedUntil && new Date(credential.lockedUntil).getTime() > now)

export const unusedRecoveryCodes = (credential: Credential) =>
  (credential.recoveryCodes ?? []).filter((c) => !c.usedAt).length

function freshRecoveryCodes(userId: number | string) {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, newRecoveryCode)
  const stored = codes.map((code) => ({
    hash: hashRecoveryCode(normalizeRecoveryCode(code)!, userId),
    usedAt: null,
  }))
  return { codes, stored }
}

/** Saves a confirmed authenticator secret and returns the recovery codes (shown once). */
export async function createCredential(
  payload: Payload,
  userId: number,
  secret: Buffer,
  firstStep: number,
) {
  const { codes, stored } = freshRecoveryCodes(userId)
  await payload.create({
    collection: 'auth-mfa',
    data: {
      user: userId,
      secret: encryptSecret(secret, userId),
      enabledAt: new Date().toISOString(),
      lastStep: firstStep,
      failures: 0,
      recoveryCodes: stored,
    },
    overrideAccess: true,
    depth: 0,
  })
  return codes
}

export async function regenerateRecoveryCodes(payload: Payload, credential: Credential) {
  const { codes, stored } = freshRecoveryCodes(accountOf(credential))
  await payload.update({
    collection: 'auth-mfa',
    id: credential.id,
    data: { recoveryCodes: stored },
    overrideAccess: true,
    depth: 0,
  })
  return codes
}

export type CheckResult =
  { ok: true; method: 'totp' | 'recovery'; recoveryLeft: number } | { ok: false; locked: boolean }

/**
 * Checks an authenticator code (or, where allowed, a recovery code) and records the outcome:
 * on success the used step or recovery code can never be used again and the failure count is
 * reset; on failure it is counted, and too many failures lock the second factor.
 */
export async function checkSecondFactor(
  payload: Payload,
  credential: Credential,
  input: { code?: unknown; recoveryCode?: unknown },
  allowRecovery: boolean,
): Promise<CheckResult> {
  if (isLocked(credential)) return { ok: false, locked: true }
  const userId = accountOf(credential)

  if (typeof input.code === 'string') {
    const secret = decryptSecret(credential.secret, userId)
    const step = verifyTotp(secret, input.code, credential.lastStep)
    // Compare-and-set in one statement: two requests with the same code cannot both succeed.
    if (
      step !== null &&
      (await claim(
        payload,
        sql`
      update auth_mfa set last_step = ${step}, failures = 0, failures_since = null,
        locked_until = null
      where id = ${credential.id} and last_step < ${step} returning id`,
      ))
    ) {
      return { ok: true, method: 'totp', recoveryLeft: unusedRecoveryCodes(credential) }
    }
  } else if (allowRecovery && typeof input.recoveryCode === 'string') {
    const normalized = normalizeRecoveryCode(input.recoveryCode)
    const hash = normalized ? hashRecoveryCode(normalized, userId) : ''
    let match: string | null = null
    // Compare against every stored code, used or not, so the timing reveals nothing.
    for (const entry of credential.recoveryCodes ?? []) {
      const equal = safeEqual(entry.hash, hash)
      if (equal && !entry.usedAt && match === null) match = entry.id ?? null
    }
    if (
      normalized &&
      match !== null &&
      (await claim(
        payload,
        sql`
        update auth_mfa_recovery_codes set used_at = now()
        where id = ${match} and _parent_id = ${credential.id} and used_at is null
        returning id`,
      ))
    ) {
      await payload.update({
        collection: 'auth-mfa',
        id: credential.id,
        data: { failures: 0, failuresSince: null, lockedUntil: null },
        overrideAccess: true,
        depth: 0,
      })
      return { ok: true, method: 'recovery', recoveryLeft: unusedRecoveryCodes(credential) - 1 }
    }
  }

  const now = Date.now()
  const windowStart = credential.failuresSince ? new Date(credential.failuresSince).getTime() : 0
  const inWindow = now - windowStart < FAILURE_WINDOW_MS
  const failures = (inWindow ? (credential.failures ?? 0) : 0) + 1
  const locked = failures >= MAX_FAILURES
  await payload.update({
    collection: 'auth-mfa',
    id: credential.id,
    data: {
      failures,
      failuresSince:
        inWindow && credential.failuresSince
          ? credential.failuresSince
          : new Date(now).toISOString(),
      lockedUntil: locked
        ? new Date(now + LOCK_MS).toISOString()
        : (credential.lockedUntil ?? null),
    },
    overrideAccess: true,
    depth: 0,
  })
  return { ok: false, locked }
}

/** Runs a conditional UPDATE … RETURNING; true if it changed a row. */
async function claim(payload: Payload, statement: ReturnType<typeof sql>) {
  const { drizzle } = payload.db as unknown as PostgresAdapter
  const result = await drizzle.execute(statement)
  return result.rows.length > 0
}

export async function deleteCredential(payload: Payload, userId: number) {
  await payload.delete({
    collection: 'auth-mfa',
    where: { user: { equals: userId } },
    overrideAccess: true,
  })
}
