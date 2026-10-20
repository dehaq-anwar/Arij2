import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import type { APIRequestContext, BrowserContext } from '@playwright/test'

import { totpCode, totpStep } from '../../src/cms/auth/totp'
import { account, adminUrl, freshAddress } from './fixtures'
import { STATE_FILE, testTotpSecret, type AccountName, type E2EState } from './secrets'
import { expect } from './test'

/**
 * The last time step used per account, kept in a file: after a failed test Playwright starts a
 * new worker process with the same accounts, which must not reuse a step the old one used.
 */
const STEP_DIR = path.join(os.tmpdir(), 'yop-e2e-totp-steps')
const stepFile = (email: string) =>
  path.join(STEP_DIR, createHash('sha256').update(email).digest('hex').slice(0, 16))

function lastStepOf(email: string) {
  try {
    return Number(readFileSync(stepFile(email), 'utf8'))
  } catch {
    return -1
  }
}

/**
 * A fresh code for the account. A code (time step) is accepted only once, so if this account
 * already used the current step, it waits for the next 30-second step.
 */
export async function nextCode(name: AccountName): Promise<string> {
  const { email, password } = account(name)
  let step = totpStep()
  if (step <= lastStepOf(email)) {
    await new Promise((resolve) => setTimeout(resolve, (step + 1) * 30_000 - Date.now() + 250))
    step = totpStep()
  }
  mkdirSync(STEP_DIR, { recursive: true })
  writeFileSync(stepFile(email), String(step))
  return totpCode(testTotpSecret(password, email), step)
}

/** Password step only: the token of a pending sign-in (not accepted anywhere yet). */
export async function passwordOnly(request: APIRequestContext, name: AccountName) {
  const response = await request.post(adminUrl('/api/users/login'), {
    data: account(name),
    headers: { 'X-Forwarded-For': freshAddress() },
  })
  expect(response.status(), `password sign-in of ${name}`).toBe(200)
  return ((await response.json()) as { token: string }).token
}

export const verifySecondFactor = (
  request: APIRequestContext,
  token: string,
  data: { code?: string; recoveryCode?: string },
) =>
  request.post(adminUrl('/api/users/mfa/verify'), {
    data,
    headers: { Authorization: `JWT ${token}`, 'X-Forwarded-For': freshAddress() },
  })

const tokens = new Map<string, string>()

/** A complete sign-in (password + code), reused by the tests of this worker. */
export async function signedInToken(request: APIRequestContext, name: AccountName, fresh = false) {
  const { email } = account(name)
  const cached = tokens.get(email)
  if (cached && !fresh) return cached
  const token = await passwordOnly(request, name)
  const verify = await verifySecondFactor(request, token, { code: await nextCode(name) })
  expect(verify.status(), `second factor of ${name}`).toBe(200)
  tokens.set(email, token)
  return token
}

export const authHeaders = async (request: APIRequestContext, name: AccountName) => ({
  Authorization: `JWT ${await signedInToken(request, name)}`,
})

/** Puts a signed-in session into the browser (the Control Center host only). */
export async function signInBrowser(
  context: BrowserContext,
  request: APIRequestContext,
  name: AccountName,
  fresh = false,
) {
  const token = await signedInToken(request, name, fresh)
  await context.addCookies([
    {
      name: 'payload-token',
      value: token,
      url: adminUrl('/'),
      httpOnly: true,
      sameSite: 'Strict',
    },
  ])
}

export const e2eState = (): E2EState =>
  JSON.parse(readFileSync(path.resolve(process.cwd(), STATE_FILE), 'utf8')) as E2EState

export async function confirmStepUp(request: APIRequestContext, name: AccountName) {
  // Sign in first: a sign-in can use a newer time step, after which an older code is a replay.
  const headers = await authHeaders(request, name)
  const response = await request.post(adminUrl('/api/users/mfa/step-up'), {
    data: { code: await nextCode(name) },
    headers: { ...headers, 'X-Forwarded-For': freshAddress() },
  })
  expect(response.status(), 'step-up').toBe(200)
}
