import { headersWithCors, type Endpoint, type PayloadRequest } from 'payload'
import { generateCookie, generateExpiredPayloadCookie, parseCookies } from 'payload/shared'
import { encode } from 'uqr'

import { allowAttempt, clientAddress, LIMITS } from '../../lib/forms/rate-limit'
import { can, LIMITED_ROLES, type PermissionSubject, type Role } from '../access/permissions'
import { audit, type AuditActor } from '../audit/log'
import { decryptSecret, encryptSecret, hashDeviceToken, newDeviceToken } from './crypto'
import { DEVICE_COOKIE, DEVICE_COOKIE_MAX_AGE_SECONDS, describeDevice } from './device'
import {
  checkSecondFactor,
  createCredential,
  deleteCredential,
  getCredential,
  isLocked,
  regenerateRecoveryCodes,
} from './mfa'
import { sendSecurityNotice } from './notify'
import { currentSession, hasFreshStepUp } from './session-state'
import {
  activateSession,
  endAllSessions,
  endSession,
  findSession,
  MAX_ATTEMPTS_PER_SIGN_IN,
  userIdOf,
  type AuthSession,
} from './sessions'
import { readTokenReference } from './token'
import { formatSecret, newTotpSecret, totpUri, verifyTotp } from './totp'

type Account = {
  id: number
  name: string
  email: string
  role: Role
  disabled?: boolean | null
}

const respond = (
  req: PayloadRequest,
  body: Record<string, unknown>,
  status = 200,
  cookies: string[] = [],
) => {
  const headers = headersWithCors({ headers: new Headers(), req })
  headers.set('Cache-Control', 'no-store')
  for (const cookie of cookies) headers.append('Set-Cookie', cookie)
  return Response.json(body, { status, headers })
}

const fail = (req: PayloadRequest, error: string, status: number, extra = {}) =>
  respond(req, { error, ...extra }, status)

async function readBody(req: PayloadRequest): Promise<Record<string, unknown>> {
  try {
    const body = req.json ? await req.json() : {}
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

const loadAccount = async (req: PayloadRequest, id: number | string) =>
  (await req.payload.findByID({
    collection: 'users',
    id,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })) as Account | null

const actorOf = (account: Account): AuditActor => ({
  id: account.id,
  name: account.name,
  role: account.role,
})

const limited = async (req: PayloadRequest) =>
  !(await allowAttempt(req.payload, 'mfa', clientAddress(req.headers), LIMITS.login))

const deviceCookie = (token: string) =>
  generateCookie({
    name: DEVICE_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'Strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DEVICE_COOKIE_MAX_AGE_SECONDS,
    returnCookieAsObject: false,
  }) as string

/** The pending sign-in this request belongs to (password given, second factor not yet). */
async function pendingSignIn(req: PayloadRequest) {
  const ref = await readTokenReference(req)
  if (!ref) return null
  const session = await findSession(req.payload, ref.sid, 'pending')
  if (!session || String(userIdOf(session)) !== String(ref.userId)) return null
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await endSession(req.payload, session, 'expired')
    return null
  }
  const account = await loadAccount(req, ref.userId)
  if (!account || account.disabled) return null
  return { session, account }
}

/**
 * Recognises the device by its cookie; a device this account never used before is recorded
 * and, if the account already had other devices, reported to the account by e-mail.
 */
async function recogniseDevice(req: PayloadRequest, account: Account) {
  const existing = parseCookies(req.headers).get(DEVICE_COOKIE)
  const token = existing && existing.length >= 32 ? existing : newDeviceToken()
  const deviceHash = hashDeviceToken(token)
  const info = describeDevice(req.headers.get('user-agent'))
  const known = await req.payload.find({
    collection: 'trusted-devices',
    where: { user: { equals: account.id } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })
  const match = known.docs.find((d) => (d as { deviceHash?: string }).deviceHash === deviceHash)
  if (match) {
    await req.payload.update({
      collection: 'trusted-devices',
      id: match.id,
      data: { lastSeenAt: new Date().toISOString() },
      overrideAccess: true,
      depth: 0,
    })
  } else {
    await req.payload.create({
      collection: 'trusted-devices',
      data: { user: account.id, deviceHash, ...info, lastSeenAt: new Date().toISOString() },
      overrideAccess: true,
      depth: 0,
    })
    if (known.totalDocs > 0) {
      await audit(req.payload, {
        action: 'auth.new_device',
        area: 'security',
        actor: actorOf(account),
        target: { type: 'users', id: account.id, label: account.name },
        detail: { browser: info.browser, os: info.os, deviceClass: info.deviceClass },
      })
      await sendSecurityNotice(req.payload, account.email, {
        kind: 'newDevice',
        browser: info.browser,
        os: info.os,
      })
    }
  }
  return { deviceHash, cookies: existing === token ? [] : [deviceCookie(token)] }
}

async function signedIn(
  req: PayloadRequest,
  session: AuthSession,
  account: Account,
  method: 'totp' | 'recovery' | 'enrollment',
) {
  const { deviceHash, cookies } = await recogniseDevice(req, account)
  await activateSession(req.payload, session, method, deviceHash)
  await audit(req.payload, {
    action: 'auth.login',
    area: 'security',
    actor: actorOf(account),
    target: { type: 'users', id: account.id, label: account.name },
    detail: { method, browser: session.browser, os: session.os },
  })
  return cookies
}

/** Counts a wrong code against this sign-in; after too many, the password must be given again. */
async function wrongCode(
  req: PayloadRequest,
  session: AuthSession,
  account: Account,
  locked: boolean,
) {
  const attempts = (session.attempts ?? 0) + 1
  await audit(req.payload, {
    action: locked ? 'auth.mfa_locked' : 'auth.mfa_failed',
    area: 'security',
    result: 'failed',
    actor: actorOf(account),
    target: { type: 'users', id: account.id, label: account.name },
    detail: { attempt: attempts },
  })
  if (locked || attempts >= MAX_ATTEMPTS_PER_SIGN_IN) {
    await endSession(req.payload, session, 'failed')
    return fail(req, locked ? 'locked' : 'too_many_attempts', locked ? 423 : 401)
  }
  await req.payload.update({
    collection: 'auth-sessions',
    id: session.id,
    data: { attempts },
    overrideAccess: true,
    depth: 0,
  })
  return fail(req, 'invalid_code', 401, { attemptsLeft: MAX_ATTEMPTS_PER_SIGN_IN - attempts })
}

/** What the sign-in page shows after the password: enter a code, or set up the app first. */
const state: Endpoint = {
  path: '/mfa/state',
  method: 'post',
  handler: async (req) => {
    if (req.user && (await currentSession(req))) return respond(req, { state: 'active' })
    const pending = await pendingSignIn(req)
    if (!pending) return respond(req, { state: 'none' })
    const credential = await getCredential(req.payload, pending.account.id)
    return respond(req, {
      state: credential ? 'verify' : 'enroll',
      locked: credential ? isLocked(credential) : false,
      name: pending.account.name,
    })
  },
}

/** Setting up the authenticator app: a new secret for this sign-in (kept until confirmed). */
const enroll: Endpoint = {
  path: '/mfa/enroll',
  method: 'post',
  handler: async (req) => {
    const pending = await pendingSignIn(req)
    if (!pending) return fail(req, 'no_pending', 401)
    if (await getCredential(req.payload, pending.account.id))
      return fail(req, 'already_enrolled', 409)
    let secret: Buffer
    if (pending.session.enrollmentSecret) {
      secret = decryptSecret(pending.session.enrollmentSecret, pending.account.id)
    } else {
      secret = newTotpSecret()
      await req.payload.update({
        collection: 'auth-sessions',
        id: pending.session.id,
        data: { enrollmentSecret: encryptSecret(secret, pending.account.id) },
        overrideAccess: true,
        depth: 0,
      })
    }
    const uri = totpUri(secret, pending.account.email)
    const qr = encode(uri, { ecc: 'M', border: 0 })
    return respond(req, {
      uri,
      secret: formatSecret(secret),
      qr: qr.data.map((row) => row.map((dark) => (dark ? '1' : '0')).join('')),
    })
  },
}

/** First code from the app: saves the second factor, signs in, returns the recovery codes. */
const confirmEnrollment: Endpoint = {
  path: '/mfa/enroll/confirm',
  method: 'post',
  handler: async (req) => {
    if (await limited(req)) return fail(req, 'rate_limited', 429)
    const pending = await pendingSignIn(req)
    if (!pending?.session.enrollmentSecret) return fail(req, 'no_pending', 401)
    const { session, account } = pending
    if (await getCredential(req.payload, account.id)) return fail(req, 'already_enrolled', 409)
    const { code } = await readBody(req)
    const secret = decryptSecret(session.enrollmentSecret!, account.id)
    const step = typeof code === 'string' ? verifyTotp(secret, code, -1) : null
    if (step === null) {
      const attempts = (session.attempts ?? 0) + 1
      if (attempts >= MAX_ATTEMPTS_PER_SIGN_IN) {
        await endSession(req.payload, session, 'failed')
        return fail(req, 'too_many_attempts', 401)
      }
      await req.payload.update({
        collection: 'auth-sessions',
        id: session.id,
        data: { attempts },
        overrideAccess: true,
        depth: 0,
      })
      return fail(req, 'invalid_code', 401, { attemptsLeft: MAX_ATTEMPTS_PER_SIGN_IN - attempts })
    }
    const recoveryCodes = await createCredential(req.payload, account.id, secret, step)
    const cookies = await signedIn(req, session, account, 'enrollment')
    await audit(req.payload, {
      action: 'auth.mfa_enrolled',
      area: 'security',
      actor: actorOf(account),
      target: { type: 'users', id: account.id, label: account.name },
    })
    await sendSecurityNotice(req.payload, account.email, { kind: 'enrolled' })
    return respond(req, { ok: true, recoveryCodes }, 200, cookies)
  },
}

/** The second step of signing in: a code from the app or one recovery code. */
const verify: Endpoint = {
  path: '/mfa/verify',
  method: 'post',
  handler: async (req) => {
    if (await limited(req)) return fail(req, 'rate_limited', 429)
    const pending = await pendingSignIn(req)
    if (!pending) return fail(req, 'no_pending', 401)
    const { session, account } = pending
    const credential = await getCredential(req.payload, account.id)
    if (!credential) return fail(req, 'not_enrolled', 409)
    const body = await readBody(req)
    const result = await checkSecondFactor(req.payload, credential, body, true)
    if (!result.ok) return wrongCode(req, session, account, result.locked)
    const cookies = await signedIn(req, session, account, result.method)
    if (result.method === 'recovery') {
      await audit(req.payload, {
        action: 'auth.recovery_code_used',
        area: 'security',
        actor: actorOf(account),
        target: { type: 'users', id: account.id, label: account.name },
        detail: { left: result.recoveryLeft },
      })
      await sendSecurityNotice(req.payload, account.email, {
        kind: 'recoveryUsed',
        left: result.recoveryLeft,
      })
    }
    return respond(req, { ok: true, recoveryCodesLeft: result.recoveryLeft }, 200, cookies)
  },
}

/** "Cancel" on the code page: forgets the pending sign-in and its cookie. */
const cancel: Endpoint = {
  path: '/mfa/cancel',
  method: 'post',
  handler: async (req) => {
    const pending = await pendingSignIn(req)
    if (pending) await endSession(req.payload, pending.session, 'cancelled')
    const expired = generateExpiredPayloadCookie({
      collectionAuthConfig: req.payload.collections.users.config.auth,
      cookiePrefix: req.payload.config.cookiePrefix,
    })
    return respond(req, { ok: true }, 200, [expired])
  },
}

/** The signed-in person and their session, or a refusal. */
async function signedInContext(req: PayloadRequest) {
  const session = req.user ? await currentSession(req) : null
  if (!req.user || !session) return null
  const account = await loadAccount(req, req.user.id)
  return account ? { account, session } : null
}

/** Confirms a sensitive action with a fresh code (valid for five minutes). */
const stepUp: Endpoint = {
  path: '/mfa/step-up',
  method: 'post',
  handler: async (req) => {
    if (await limited(req)) return fail(req, 'rate_limited', 429)
    const context = await signedInContext(req)
    if (!context) return fail(req, 'not_signed_in', 401)
    const credential = await getCredential(req.payload, context.account.id)
    if (!credential) return fail(req, 'not_enrolled', 409)
    const result = await checkSecondFactor(req.payload, credential, await readBody(req), false)
    if (!result.ok) {
      await audit(req.payload, {
        action: 'auth.step_up_failed',
        area: 'security',
        result: 'failed',
        actor: actorOf(context.account),
      })
      return fail(req, result.locked ? 'locked' : 'invalid_code', result.locked ? 423 : 401)
    }
    const at = new Date()
    await req.payload.update({
      collection: 'auth-sessions',
      id: context.session.id,
      data: { stepUpAt: at.toISOString() },
      overrideAccess: true,
      depth: 0,
    })
    await audit(req.payload, {
      action: 'auth.step_up',
      area: 'security',
      actor: actorOf(context.account),
      stepUp: true,
    })
    return respond(req, { ok: true, validUntil: new Date(at.getTime() + 5 * 60 * 1000) })
  },
}

/** New recovery codes replace all old ones (needs a fresh confirmation). */
const newRecoveryCodes: Endpoint = {
  path: '/mfa/recovery-codes',
  method: 'post',
  handler: async (req) => {
    const context = await signedInContext(req)
    if (!context) return fail(req, 'not_signed_in', 401)
    if (!(await hasFreshStepUp(req))) return fail(req, 'step_up_required', 403)
    const credential = await getCredential(req.payload, context.account.id)
    if (!credential) return fail(req, 'not_enrolled', 409)
    const codes = await regenerateRecoveryCodes(req.payload, credential)
    await audit(req.payload, {
      action: 'auth.recovery_codes_regenerated',
      area: 'security',
      actor: actorOf(context.account),
      stepUp: true,
    })
    return respond(req, { ok: true, recoveryCodes: codes })
  },
}

/** Signs out one of one's own other sessions, or all others. */
const revokeSessions: Endpoint = {
  path: '/sessions/revoke',
  method: 'post',
  handler: async (req) => {
    const context = await signedInContext(req)
    if (!context) return fail(req, 'not_signed_in', 401)
    const { sid, others } = await readBody(req)
    if (others === true) {
      await endAllSessions(req.payload, context.account.id, 'revoked', context.session.sid)
    } else {
      if (typeof sid !== 'string' || sid === context.session.sid) return fail(req, 'invalid', 400)
      const target = await findSession(req.payload, sid, 'active')
      if (!target || String(userIdOf(target)) !== String(context.account.id)) {
        return fail(req, 'not_found', 404)
      }
      await endSession(req.payload, target, 'revoked')
    }
    await audit(req.payload, {
      action: 'auth.session_revoked',
      area: 'security',
      actor: actorOf(context.account),
      detail: { scope: others === true ? 'others' : 'one' },
    })
    return respond(req, { ok: true })
  },
}

/** Removes a device from one's list (its next sign-in counts as new again). */
const forgetDevice: Endpoint = {
  path: '/devices/forget',
  method: 'post',
  handler: async (req) => {
    const context = await signedInContext(req)
    if (!context) return fail(req, 'not_signed_in', 401)
    const { id } = await readBody(req)
    if (typeof id !== 'number' && typeof id !== 'string') return fail(req, 'invalid', 400)
    await req.payload.delete({
      collection: 'trusted-devices',
      where: { id: { equals: id }, user: { equals: context.account.id } },
      overrideAccess: true,
    })
    return respond(req, { ok: true })
  },
}

/**
 * Whether the signed-in person may manage the target account's security: super administrators
 * every other account, board administrators only content editors and membership managers.
 */
function mayManage(actor: Account, target: Account) {
  if (actor.id === target.id) return false
  if (can(actor as PermissionSubject, 'users.manage')) return true
  return (
    can(actor as PermissionSubject, 'users.manageLimited') && LIMITED_ROLES.includes(target.role)
  )
}

const manageTarget = (action: 'reset-mfa' | 'end-sessions'): Endpoint => ({
  path: `/security/:id/${action}`,
  method: 'post',
  handler: async (req) => {
    const context = await signedInContext(req)
    if (!context) return fail(req, 'not_signed_in', 401)
    const target = await loadAccount(req, String(req.routeParams?.id ?? ''))
    if (!target || !mayManage(context.account, target)) {
      await audit(req.payload, {
        action: `users.${action}`,
        area: 'users',
        result: 'denied',
        actor: actorOf(context.account),
        target: { type: 'users', id: target?.id ?? null, label: target?.name ?? null },
      })
      return fail(req, 'not_allowed', 403)
    }
    if (!(await hasFreshStepUp(req))) return fail(req, 'step_up_required', 403)
    if (action === 'reset-mfa') {
      await deleteCredential(req.payload, target.id)
      await req.payload.delete({
        collection: 'trusted-devices',
        where: { user: { equals: target.id } },
        overrideAccess: true,
      })
      await endAllSessions(req.payload, target.id, 'mfaReset')
      await sendSecurityNotice(req.payload, target.email, { kind: 'mfaReset' })
    } else {
      await endAllSessions(req.payload, target.id, 'revoked')
    }
    await audit(req.payload, {
      action: `users.${action}`,
      area: 'users',
      actor: actorOf(context.account),
      target: { type: 'users', id: target.id, label: target.name },
      stepUp: true,
    })
    return respond(req, { ok: true })
  },
})

export const authEndpoints: Endpoint[] = [
  state,
  enroll,
  confirmEnrollment,
  verify,
  cancel,
  stepUp,
  newRecoveryCodes,
  revokeSessions,
  forgetDevice,
  manageTarget('reset-mfa'),
  manageTarget('end-sessions'),
]
