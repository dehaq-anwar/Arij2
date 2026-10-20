import AxeBuilder from '@axe-core/playwright'
import type { APIRequestContext, Page } from '@playwright/test'

import {
  authHeaders,
  confirmStepUp,
  e2eState,
  nextCode,
  passwordOnly,
  signedInToken,
  signInBrowser,
  verifySecondFactor,
} from './auth'
import { account, adminUrl, ADMIN_ORIGIN, freshAddress } from './fixtures'
import type { AccountName } from './secrets'
import { expect, test } from './test'

const me = async (request: APIRequestContext, token: string) =>
  (
    (await (
      await request.get(adminUrl('/api/users/me'), { headers: { Authorization: `JWT ${token}` } })
    ).json()) as { user: { id: number; role: string } | null }
  ).user

const idOf = async (request: APIRequestContext, name: AccountName) => {
  // Payload stores e-mail addresses in lower case (sign-in ignores case, queries do not).
  const email = account(name).email.toLowerCase()
  const response = await request.get(
    adminUrl(`/api/users?where[email][equals]=${encodeURIComponent(email)}&depth=0`),
    { headers: await authHeaders(request, 'superAdmin') },
  )
  return ((await response.json()) as { docs: { id: number }[] }).docs[0]!.id
}

async function signInWithForm(page: Page, name: AccountName) {
  await page.setExtraHTTPHeaders({ 'X-Forwarded-For': freshAddress() })
  await page.goto(adminUrl('/admin/login'))
  await page.getByLabel('E-Mail-Adresse').fill(account(name).email)
  await page.getByLabel('Passwort').fill(account(name).password)
  await page.getByRole('button', { name: 'Weiter' }).click()
}

test.use({ locale: 'de-DE' })
// A code (time step) is accepted only once, so a test that needs a second code for the same
// account waits for the next 30-second step.
test.describe.configure({ timeout: 90_000 })

test.describe('the password alone signs nobody in', () => {
  test('a token from the password step is accepted nowhere', async ({ request }) => {
    const token = await passwordOnly(request, 'contentEditor')
    const headers = { Authorization: `JWT ${token}` }
    expect(await me(request, token)).toBeNull()
    expect(
      (await request.get(adminUrl('/api/projects?draft=true&limit=100'), { headers })).ok(),
    ).toBe(true)
    const drafts = await (
      await request.get(adminUrl('/api/projects?draft=true&limit=100'), { headers })
    ).text()
    expect(drafts).not.toContain('e2e-unveroeffentlicht')
    expect((await request.get(adminUrl('/api/users'), { headers })).status()).toBe(403)
    expect(
      (await request.post(adminUrl('/api/projects'), { headers, data: { title: 'x' } })).status(),
    ).toBe(403)
    expect(
      (await request.post(adminUrl('/api/users/refresh-token'), { headers })).status(),
    ).not.toBe(200)
    // GraphQL is switched off, so it cannot be a way around either.
    expect(
      (
        await request.post(adminUrl('/api/graphql'), { headers, data: { query: '{ __typename }' } })
      ).ok(),
    ).toBe(false)
  })

  test('the admin sends a pending sign-in to the code step', async ({ page, request }) => {
    const token = await passwordOnly(request, 'contentEditor')
    await page
      .context()
      .addCookies([{ name: 'payload-token', value: token, url: adminUrl('/'), httpOnly: true }])
    await page.goto(adminUrl('/admin/collections/projects'))
    await expect(page).toHaveURL(/\/admin\/login/)
    await expect(page.getByRole('heading', { name: 'Bestätigungscode' })).toBeVisible()
  })

  test('a password reset does not skip the second factor', async ({ request }) => {
    const { email } = account('reset')
    const reset = await request.post(adminUrl('/api/users/reset-password'), {
      data: { token: e2eState().resetTokens[email], password: account('reset').password },
      headers: { 'X-Forwarded-For': freshAddress() },
    })
    expect(reset.status()).toBe(200)
    const { token } = (await reset.json()) as { token: string }
    expect(token).toBeTruthy()
    expect(await me(request, token)).toBeNull()
    const verify = await verifySecondFactor(request, token, { code: await nextCode('reset') })
    expect(verify.status()).toBe(200)
    expect((await me(request, token))?.role).toBe('contentEditor')
  })

  test('a deactivated account cannot sign in', async ({ request }) => {
    const response = await request.post(adminUrl('/api/users/login'), {
      data: account('disabled'),
      headers: { 'X-Forwarded-For': freshAddress() },
    })
    expect(response.status()).toBe(403)
  })
})

test.describe('second factor', () => {
  test('signing in with the form and the code from the app', async ({ page }) => {
    await signInWithForm(page, 'ui')
    await expect(page.getByRole('heading', { name: 'Bestätigungscode' })).toBeVisible()
    await page.getByLabel('Code aus der App').fill('000000')
    await page.getByRole('button', { name: 'Bestätigen' }).click()
    // Next.js keeps an empty route announcer with the same role, so look for the message itself.
    const error = page.getByRole('alert').filter({ hasText: 'Der Code ist falsch' })
    await expect(error).toContainText('Verbleibende Versuche: 4')
    await page.getByLabel('Code aus der App').fill(await nextCode('ui'))
    await page.getByRole('button', { name: 'Bestätigen' }).click()
    await page.waitForURL(adminUrl('/admin'))
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E')
    await expect(page.locator('#nav-dashboard')).toHaveAttribute('aria-current', 'page')
    // The session cookie was set by the server for the Control Center's host only.
    const adminCookies = await page.context().cookies(adminUrl('/'))
    expect(adminCookies.find((c) => c.name === 'payload-token')).toBeTruthy()
    const siteCookies = await page.context().cookies('http://127.0.0.1:3100')
    expect(siteCookies.find((c) => c.name === 'payload-token')).toBeUndefined()
  })

  test('first sign-in: set up the app, keep the recovery codes, then a code is required', async ({
    page,
    request,
  }) => {
    await signInWithForm(page, 'fresh')
    await expect(
      page.getByRole('heading', { name: 'Zwei-Faktor-Anmeldung einrichten' }),
    ).toBeVisible()
    await expect(page.getByRole('img', { name: 'QR-Code für die Authenticator-App' })).toBeVisible()
    const secret = (await page.locator('.yop-enroll__secret code').innerText()).replace(/\s/g, '')
    expect(secret).toMatch(/^[A-Z2-7]{32}$/)
    const { totpCode, totpStep } = await import('../../src/cms/auth/totp')
    const { Secret } = await import('otpauth')
    const bytes = Buffer.from(Secret.fromBase32(secret).bytes)
    await page.getByLabel('Geben Sie den Code ein').fill(totpCode(bytes, totpStep()))
    await page.getByRole('button', { name: 'Bestätigen' }).click()
    await expect(page.getByRole('heading', { name: 'Ihre Wiederherstellungscodes' })).toBeVisible()
    const codes = await page.locator('.yop-codes code').allInnerTexts()
    expect(codes).toHaveLength(10)
    for (const code of codes) expect(code).toMatch(/^[0-9A-Z]{5}-[0-9A-Z]{5}$/)
    const proceed = page.getByRole('button', { name: 'Zum Control Center' })
    await expect(proceed).toBeDisabled()
    await page.getByLabel('Ich habe die Codes sicher aufbewahrt.').check()
    await proceed.click()
    await page.waitForURL(adminUrl('/admin'))

    // From now on the password is not enough for this account.
    const token = await passwordOnly(request, 'fresh')
    const state = await request.post(adminUrl('/api/users/mfa/state'), {
      headers: { Authorization: `JWT ${token}` },
    })
    expect(((await state.json()) as { state: string }).state).toBe('verify')
    expect(
      (
        await request.post(adminUrl('/api/users/mfa/enroll'), {
          headers: { Authorization: `JWT ${token}` },
        })
      ).status(),
    ).toBe(409)
  })

  test('a recovery code works once', async ({ request }) => {
    const [code] = e2eState().recoveryCodes[account('recovery').email]!
    const first = await passwordOnly(request, 'recovery')
    const used = await verifySecondFactor(request, first, { recoveryCode: code!.toLowerCase() })
    expect(used.status()).toBe(200)
    expect(((await used.json()) as { recoveryCodesLeft: number }).recoveryCodesLeft).toBe(9)
    expect(await me(request, first)).not.toBeNull()

    const second = await passwordOnly(request, 'recovery')
    const again = await verifySecondFactor(request, second, { recoveryCode: code! })
    expect(again.status()).toBe(401)
    expect(await me(request, second)).toBeNull()
  })

  test('the same code cannot be used twice', async ({ request }) => {
    const code = await nextCode('second')
    const first = await passwordOnly(request, 'second')
    expect((await verifySecondFactor(request, first, { code })).status()).toBe(200)
    const second = await passwordOnly(request, 'second')
    expect((await verifySecondFactor(request, second, { code })).status()).toBe(401)
  })

  test('too many wrong codes end the sign-in', async ({ request }) => {
    const token = await passwordOnly(request, 'lockout')
    for (let attempt = 1; attempt <= 4; attempt++) {
      const response = await verifySecondFactor(request, token, { code: '000000' })
      expect(response.status()).toBe(401)
      expect(((await response.json()) as { attemptsLeft: number }).attemptsLeft).toBe(5 - attempt)
    }
    const last = await verifySecondFactor(request, token, { code: '000000' })
    expect(((await last.json()) as { error: string }).error).toBe('too_many_attempts')
    // Even the right code no longer helps this sign-in.
    const late = await verifySecondFactor(request, token, { code: await nextCode('lockout') })
    expect(((await late.json()) as { error: string }).error).toBe('no_pending')
  })

  test('signing out another session ends it', async ({ request }) => {
    // Two complete sign-ins of one account need two time steps (up to a minute of waiting).
    test.setTimeout(120_000)
    const other = await signedInToken(request, 'second', true)
    const current = await signedInToken(request, 'second', true)
    const sessions = await request.post(adminUrl('/api/users/sessions/revoke'), {
      data: { others: true },
      headers: { Authorization: `JWT ${current}` },
    })
    expect(sessions.status()).toBe(200)
    expect(await me(request, other)).toBeNull()
    expect(await me(request, current)).not.toBeNull()
  })
})

test.describe('roles', () => {
  const read = async (request: APIRequestContext, name: AccountName, path: string) =>
    (await request.get(adminUrl(path), { headers: await authHeaders(request, name) })).status()

  test('each role reaches exactly its areas through the API', async ({ request }) => {
    const expected: Record<string, Record<string, number>> = {
      '/api/membership-applications?limit=1': {
        superAdmin: 200,
        boardAdmin: 200,
        membershipManager: 200,
        contentEditor: 403,
        technicalAdmin: 403,
        auditor: 403,
      },
      '/api/contact-messages?limit=1': {
        superAdmin: 200,
        boardAdmin: 200,
        membershipManager: 200,
        contentEditor: 403,
        technicalAdmin: 403,
        auditor: 403,
      },
      '/api/audit-log?limit=1': {
        superAdmin: 200,
        boardAdmin: 200,
        technicalAdmin: 200,
        auditor: 200,
        contentEditor: 403,
        membershipManager: 403,
      },
    }
    for (const [path, roles] of Object.entries(expected)) {
      for (const [role, status] of Object.entries(roles)) {
        expect(await read(request, role as AccountName, path), `${role} ${path}`).toBe(status)
      }
    }
  })

  test('drafts and accounts are visible only to the roles that need them', async ({ request }) => {
    const drafts = async (name: AccountName) =>
      (
        await (
          await request.get(adminUrl('/api/projects?draft=true&limit=100&depth=0'), {
            headers: await authHeaders(request, name),
          })
        ).text()
      ).includes('e2e-unveroeffentlicht')
    expect(await drafts('contentEditor')).toBe(true)
    expect(await drafts('boardAdmin')).toBe(true)
    expect(await drafts('auditor')).toBe(true)
    expect(await drafts('technicalAdmin')).toBe(false)
    expect(await drafts('membershipManager')).toBe(false)

    const accounts = async (name: AccountName) =>
      (
        (await (
          await request.get(adminUrl('/api/users?limit=200&depth=0'), {
            headers: await authHeaders(request, name),
          })
        ).json()) as { totalDocs: number }
      ).totalDocs
    expect(await accounts('superAdmin')).toBeGreaterThan(10)
    expect(await accounts('auditor')).toBeGreaterThan(10)
    expect(await accounts('contentEditor')).toBe(1)
    expect(await accounts('technicalAdmin')).toBe(1)
  })

  test('only the content role writes content, only the super admin deletes applications', async ({
    request,
  }) => {
    for (const [name, status] of [
      ['contentEditor', 201],
      ['boardAdmin', 403],
      ['technicalAdmin', 403],
      ['auditor', 403],
    ] as const) {
      const response = await request.post(adminUrl('/api/focus-areas?locale=de'), {
        headers: await authHeaders(request, name),
        data: { title: `E2E Rolle ${name}`, summary: 'E2E', icon: 'peace', order: 99 },
      })
      expect(response.status(), name).toBe(status)
      if (response.status() === 201) {
        const { doc } = (await response.json()) as { doc: { id: number } }
        await request.delete(adminUrl(`/api/focus-areas/${doc.id}`), {
          headers: await authHeaders(request, name),
        })
      }
    }
  })

  test('the technical administrator sees no association data in the admin', async ({
    page,
    request,
  }) => {
    await signInBrowser(page.context(), request, 'technicalAdmin')
    await page.goto(adminUrl('/admin'))
    await expect(
      page.locator('nav a[href*="membership-applications"], nav a[href*="contact-messages"]'),
    ).toHaveCount(0)
    await expect(page.locator('#nav-audit-log')).toBeVisible()
    await page.goto(adminUrl('/admin/collections/membership-applications'))
    await expect(page.locator('body')).not.toContainText('E2E Retention')
  })

  test('the content editor sees no accounts, audit log or association data', async ({
    page,
    request,
  }) => {
    await signInBrowser(page.context(), request, 'contentEditor')
    await page.goto(adminUrl('/admin'))
    await expect(page.locator('#nav-projects')).toBeVisible()
    await expect(
      page.locator('#nav-users, #nav-audit-log, #nav-membership-applications'),
    ).toHaveCount(0)
  })
})

test.describe('sensitive changes', () => {
  test('changing a role needs a fresh code, and is logged', async ({ request }) => {
    const target = await idOf(request, 'target')
    const headers = await authHeaders(request, 'superAdmin')
    const change = (role: string) =>
      request.patch(adminUrl(`/api/users/${target}`), { headers, data: { role } })
    const refused = await change('auditor')
    expect(refused.status()).toBe(403)
    expect((await refused.text()).toLowerCase()).toContain('authenticator')
    await confirmStepUp(request, 'superAdmin')
    expect((await change('auditor')).status()).toBe(200)
    expect((await change('contentEditor')).status()).toBe(200)
    const log = await request.get(
      adminUrl(
        `/api/audit-log?where[targetId][equals]=${target}&where[action][equals]=users.update&sort=-createdAt&limit=2`,
      ),
      { headers },
    )
    const { docs } = (await log.json()) as {
      docs: { detail: { role?: { from: string; to: string } }; stepUp: boolean }[]
    }
    expect(docs[0]!.detail.role).toEqual({ from: 'auditor', to: 'contentEditor' })
    expect(docs[0]!.stepUp).toBe(true)
  })

  test('board administrators manage only editors and membership managers', async ({ request }) => {
    const target = await idOf(request, 'target')
    await confirmStepUp(request, 'boardAdmin')
    const headers = await authHeaders(request, 'boardAdmin')
    expect(
      (
        await request.patch(adminUrl(`/api/users/${target}`), {
          headers,
          data: { role: 'superAdmin' },
        })
      ).status(),
    ).toBe(403)
    expect(
      (
        await request.patch(adminUrl(`/api/users/${target}`), {
          headers,
          data: { role: 'membershipManager' },
        })
      ).status(),
    ).toBe(200)
    expect(
      (
        await request.patch(adminUrl(`/api/users/${target}`), {
          headers,
          data: { role: 'contentEditor' },
        })
      ).status(),
    ).toBe(200)
    const superAdmin = await idOf(request, 'superAdmin')
    expect(
      (
        await request.patch(adminUrl(`/api/users/${superAdmin}`), { headers, data: { name: 'x' } })
      ).status(),
    ).toBe(403)
  })

  test('nobody changes their own role', async ({ request }) => {
    await confirmStepUp(request, 'boardAdmin')
    const headers = await authHeaders(request, 'boardAdmin')
    const own = await idOf(request, 'boardAdmin')
    // The role field is not writable on one's own account: the value is ignored or refused.
    await request.patch(adminUrl(`/api/users/${own}`), { headers, data: { role: 'superAdmin' } })
    expect((await me(request, await signedInToken(request, 'boardAdmin')))?.role).toBe('boardAdmin')
  })

  test('the audit log cannot be changed or deleted', async ({ request }) => {
    const headers = await authHeaders(request, 'superAdmin')
    const { docs } = (await (
      await request.get(adminUrl('/api/audit-log?limit=1'), { headers })
    ).json()) as { docs: { id: number }[] }
    const id = docs[0]!.id
    expect(
      (
        await request.patch(adminUrl(`/api/audit-log/${id}`), { headers, data: { action: 'x' } })
      ).status(),
    ).toBe(403)
    expect((await request.delete(adminUrl(`/api/audit-log/${id}`), { headers })).status()).toBe(403)
    expect(
      (
        await request.post(adminUrl('/api/audit-log'), {
          headers,
          data: { action: 'x', area: 'security' },
        })
      ).status(),
    ).toBe(403)
  })
})

test.describe('separate admin host', () => {
  test('the public host has no admin and no API, except media files', async ({ request }) => {
    for (const path of [
      '/admin',
      '/admin/login',
      '/api/users/login',
      '/api/projects',
      '/api/users/me',
    ]) {
      const response = await request.get(path, { maxRedirects: 0 })
      expect(response.status(), path).toBe(404)
    }
    expect((await request.post('/api/users/login', { data: account('superAdmin') })).status()).toBe(
      404,
    )
    const { docs } = (await (await request.get(adminUrl('/api/media?limit=1&depth=0'))).json()) as {
      docs: { url: string }[]
    }
    const file = new URL(docs[0]!.url, ADMIN_ORIGIN).pathname
    expect((await request.get(file)).status()).toBe(200)
  })
})

test.describe('accessibility of the Control Center', () => {
  for (const [label, theme, language] of [
    ['light, German', 'light', 'de'],
    ['dark, Arabic', 'dark', 'ar'],
  ] as const) {
    test(`sign-in, dashboard and security screen (${label})`, async ({ page, request }) => {
      const cookies = [
        { name: 'payload-theme', value: theme, url: adminUrl('/') },
        { name: 'payload-lng', value: language, url: adminUrl('/') },
      ]
      await page.context().addCookies(cookies)
      await page.goto(adminUrl('/admin/login'))
      await expect(page.locator('html')).toHaveAttribute(
        'dir',
        language === 'ar' ? /^rtl$/i : /^ltr$/i,
      )
      const results = [await new AxeBuilder({ page }).analyze()]
      await signInBrowser(page.context(), request, 'superAdmin')
      for (const path of ['/admin', '/admin/security']) {
        await page.goto(adminUrl(path), { waitUntil: 'networkidle' })
        results.push(await new AxeBuilder({ page }).include('.yop-page').analyze())
      }
      const violations = results.flatMap((r) =>
        r.violations.map((v) => `${v.id}: ${v.nodes.length}`),
      )
      expect(violations).toEqual([])
    })
  }

  test('on a phone the menu covers the page and closes again', async ({ page, request }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await signInBrowser(page.context(), request, 'superAdmin')
    await page.goto(adminUrl('/admin'))
    const fits = () =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    expect(await fits()).toBe(true)
    await page.locator('.nav-toggler:visible').first().click()
    const menu = page.locator('aside.yop-nav')
    await expect(menu.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    expect(await fits()).toBe(true)
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
    await page.locator('.nav-toggler:visible').first().click()
    await menu.getByRole('button', { name: 'Navigation schließen' }).click()
    await expect(menu).toBeHidden()
  })

  test('the dashboard loads quickly', async ({ page, request }) => {
    await signInBrowser(page.context(), request, 'superAdmin')
    await page.goto(adminUrl('/admin')) // warm-up
    await page.goto(adminUrl('/admin'), { waitUntil: 'load' })
    const timing = await page.evaluate(() => {
      const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
      return { ttfb: nav!.responseStart, load: nav!.loadEventEnd }
    })
    test.info().annotations.push({ type: 'timing', description: JSON.stringify(timing) })
    expect(timing.ttfb).toBeLessThan(3000)
    expect(timing.load).toBeLessThan(6000)
  })
})
