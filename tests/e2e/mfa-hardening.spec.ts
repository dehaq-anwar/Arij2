import type { APIRequestContext } from '@playwright/test'
import { Secret } from 'otpauth'

import { totpCode, totpStep } from '../../src/cms/auth/totp'
import { authHeaders, confirmStepUp, passwordOnly, signedInToken } from './auth'
import { account, adminUrl, freshAddress } from './fixtures'
import { expect, test } from './test'

test.use({ locale: 'de-DE' })
test.describe.configure({ timeout: 120_000 })

const send = (
  request: APIRequestContext,
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  token?: string,
  data?: unknown,
) =>
  request[method](adminUrl(path), {
    headers: {
      ...(token ? { Authorization: `JWT ${token}` } : {}),
      'X-Forwarded-For': freshAddress(),
    },
    data,
    maxRedirects: 0,
  })

/** Status and body, with JSON keys sorted (Payload builds some answers in no fixed order). */
const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .filter(([key]) => !['createdAt', 'updatedAt', 'now'].includes(key))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, inner]) => [key, canonical(inner)]),
        )
      : value
const snapshot = async (response: Awaited<ReturnType<typeof send>>) => {
  const text = await response.text()
  let body = text
  try {
    body = JSON.stringify(canonical(JSON.parse(text)))
  } catch {
    // not JSON: compared as it is
  }
  return { status: response.status(), body }
}

test.describe('the password alone opens nothing', () => {
  test('a super administrator’s password-only token gets exactly what a visitor gets', async ({
    request,
  }) => {
    // Every collection and global the Control Center has, as Payload reports them.
    const access = (await (
      await send(request, 'get', '/api/access', await signedInToken(request, 'superAdmin'))
    ).json()) as { collections: Record<string, unknown>; globals: Record<string, unknown> }
    const collections = Object.keys(access.collections)
    const globals = Object.keys(access.globals)
    expect(collections).toEqual(
      expect.arrayContaining(['members', 'exports', 'notifications', 'users']),
    )

    const pending = await passwordOnly(request, 'superAdmin')
    const checks: [method: 'get' | 'post' | 'patch' | 'delete', path: string, data?: unknown][] = [
      ['get', '/api/access'],
      ['get', '/api/users/me'],
      ['post', '/api/users/refresh-token'],
      ['get', '/api/notifications/feed'],
      ['post', '/api/notifications/read', { all: true }],
      ['post', '/api/exports/run', { dataset: 'members' }],
      ['post', '/api/users/sessions/revoke', { others: true }],
      ['post', '/api/users/mfa/step-up', { code: '000000' }],
      ['post', '/api/users/mfa/recovery-codes'],
      ['post', '/api/users/security/1/reset-mfa'],
      ['post', '/api/users/security/1/end-sessions'],
      ['get', '/api/payload-jobs/run?queue=maintenance'],
      ['get', '/api/payload-preferences'],
    ]
    for (const slug of collections) {
      checks.push(['get', `/api/${slug}?limit=3&depth=0&sort=id`])
      checks.push(['get', `/api/${slug}/count`])
      checks.push(['post', `/api/${slug}`, {}])
      checks.push(['patch', `/api/${slug}/1`, {}])
      checks.push(['delete', `/api/${slug}/1`])
    }
    for (const slug of globals) {
      checks.push(['get', `/api/globals/${slug}?depth=0`])
      checks.push(['post', `/api/globals/${slug}`, {}])
    }
    const differences: string[] = []
    for (const [method, path, data] of checks) {
      const visitor = await snapshot(await send(request, method, path, undefined, data))
      const withPassword = await snapshot(await send(request, method, path, pending, data))
      if (visitor.status !== withPassword.status || visitor.body !== withPassword.body) {
        differences.push(
          `${method.toUpperCase()} ${path}: ${visitor.status} vs ${withPassword.status}`,
        )
      }
    }
    expect(differences).toEqual([])
    // And the token is still only pending: the code is what completes the sign-in.
    expect(
      ((await (await send(request, 'get', '/api/users/me', pending)).json()) as { user: unknown })
        .user,
    ).toBeNull()
  })

  test('no screen of the Control Center opens with it', async ({ page, request }) => {
    const pending = await passwordOnly(request, 'superAdmin')
    await page.context().addCookies([
      {
        name: 'payload-token',
        value: pending,
        url: adminUrl('/'),
        httpOnly: true,
        sameSite: 'Strict',
      },
    ])
    for (const path of [
      '/admin',
      '/admin/collections/members',
      '/admin/collections/membership-applications/1',
      '/admin/collections/users',
      '/admin/collections/audit-log',
      '/admin/globals/control-center-settings',
      '/admin/export',
      '/admin/notifications',
      '/admin/security',
      '/admin/account',
    ]) {
      await page.goto(adminUrl(path))
      await expect(page, path).toHaveURL(/\/admin\/login/)
      await expect(page.locator('.yop-records, .yop-export, .yop-nav'), path).toHaveCount(0)
    }
  })
})

test.describe('resetting someone’s second factor', () => {
  test('only for those allowed, only with a code, and it changes nothing else', async ({
    request,
  }) => {
    const id = async (name: Parameters<typeof account>[0]) => {
      const response = await send(
        request,
        'get',
        `/api/users?where[email][equals]=${encodeURIComponent(account(name).email.toLowerCase())}&depth=0`,
        await signedInToken(request, 'superAdmin'),
      )
      return ((await response.json()) as { docs: { id: number }[] }).docs[0]!.id
    }
    const target = await id('mfaTarget')
    const reset = async (actor: Parameters<typeof account>[0], who = target) =>
      request.post(adminUrl(`/api/users/security/${who}/reset-mfa`), {
        headers: { ...(await authHeaders(request, actor)), 'X-Forwarded-For': freshAddress() },
      })

    // Who may not: other roles, board administrators for a super administrator, anyone for
    // themselves; and nobody without a fresh code.
    for (const actor of [
      'technicalAdmin',
      'contentEditor',
      'membershipManager',
      'auditor',
    ] as const) {
      expect((await reset(actor)).status(), actor).toBe(403)
    }
    expect((await reset('boardAdmin', await id('superAdmin'))).status()).toBe(403)
    expect((await reset('superAdmin', await id('superAdmin'))).status()).toBe(403)
    // A new session: one this worker used before may still hold a recent code confirmation.
    await signedInToken(request, 'superAdmin', true)
    const noCode = await reset('superAdmin')
    expect(noCode.status()).toBe(403)
    expect(((await noCode.json()) as { error: string }).error).toBe('step_up_required')

    // The target is signed in; note what it may do.
    const before = await signedInToken(request, 'mfaTarget', true)
    const accessBefore = await (await send(request, 'get', '/api/access', before)).json()

    await confirmStepUp(request, 'superAdmin')
    expect((await reset('superAdmin')).status()).toBe(200)

    // All its sessions ended; its old app codes are useless; the password alone still opens nothing.
    expect(
      ((await (await send(request, 'get', '/api/users/me', before)).json()) as { user: unknown })
        .user,
    ).toBeNull()
    const pending = await passwordOnly(request, 'mfaTarget')
    const state = await send(request, 'post', '/api/users/mfa/state', pending)
    expect(((await state.json()) as { state: string }).state).toBe('enroll')
    const { nextCode } = await import('./auth')
    expect(
      (
        await send(request, 'post', '/api/users/mfa/verify', pending, {
          code: await nextCode('mfaTarget'),
        })
      ).status(),
    ).not.toBe(200)
    expect(
      ((await (await send(request, 'get', '/api/users/me', pending)).json()) as { user: unknown })
        .user,
    ).toBeNull()

    // Setting up a new app signs it in with exactly the same permissions as before.
    const enroll = (await (
      await send(request, 'post', '/api/users/mfa/enroll', pending)
    ).json()) as { secret: string }
    const secret = Buffer.from(Secret.fromBase32(enroll.secret.replace(/\s/g, '')).bytes)
    const confirmed = await send(request, 'post', '/api/users/mfa/enroll/confirm', pending, {
      code: totpCode(secret, totpStep()),
    })
    expect(confirmed.status()).toBe(200)
    const me = (await (await send(request, 'get', '/api/users/me', pending)).json()) as {
      user: { role: string; restrictions?: string[] }
    }
    expect(me.user.role).toBe('contentEditor')
    // Same permissions (compared as objects: Payload lists them in no fixed order).
    expect(await (await send(request, 'get', '/api/access', pending)).json()).toEqual(accessBefore)

    // Recorded, with the code confirmation.
    const log = await send(
      request,
      'get',
      `/api/audit-log?where[action][equals]=users.reset-mfa&where[targetId][equals]=${target}&where[result][equals]=ok&depth=0`,
      await signedInToken(request, 'superAdmin'),
    )
    const entry = ((await log.json()) as { docs: { stepUp: boolean; actorName: string }[] }).docs[0]
    expect(entry).toMatchObject({ stepUp: true, actorName: 'E2E Super-Admin' })
  })
})
