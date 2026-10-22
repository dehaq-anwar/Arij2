import AxeBuilder from '@axe-core/playwright'
import type { APIRequestContext, Page } from '@playwright/test'

import { authHeaders, confirmStepUp, signInBrowser } from './auth'
import { account, adminUrl, freshAddress } from './fixtures'
import type { AccountName } from './secrets'
import { expect, test } from './test'

/**
 * The e-mail screen (CC-4). Runs as its own project after the others (playwright.config.ts):
 * it points the e-mail settings at a closed port for a while, which would make the other
 * tests' e-mails fail. No e-mail leaves the test machine.
 */
test.describe.configure({ mode: 'serial' })

async function signIn(page: Page, request: APIRequestContext, name: AccountName, lang = 'de') {
  await page.context().addCookies([{ name: 'payload-lng', value: lang, url: adminUrl('/') }])
  await signInBrowser(page.context(), request, name)
}

const settings = async (request: APIRequestContext, data: Record<string, unknown>) =>
  request.post(adminUrl('/api/globals/email-settings'), {
    headers: await authHeaders(request, 'technicalAdmin'),
    data,
  })

test('without a mail server: notice, templates, addresses', async ({ page, request }) => {
  await signIn(page, request, 'technicalAdmin')
  await page.goto(adminUrl('/admin/email'))
  await expect(page.getByRole('heading', { level: 1, name: 'E-Mail' })).toBeVisible()
  await expect(page.getByText('Kein Mailserver eingerichtet')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Test-E-Mail an mich' })).toBeDisabled()
  await page.getByText('Neuer Mitgliedsantrag', { exact: true }).click()
  await expect(page.locator('.yop-mail-preview').first()).toContainText(
    'enthält bewusst keine Angaben zur Person',
  )
  await expect(page.getByText('nicht gesetzt (nur in der Glocke)')).toBeVisible()
})

test('every e-mail is in the delivery log, recipient shortened, without content', async ({
  page,
  request,
}) => {
  // A password reset for the test account: no mail server, so "not sent" — and logged.
  const email = account('technicalAdmin').email
  const reset = await request.post(adminUrl('/api/users/forgot-password'), {
    data: { email },
    headers: { 'X-Forwarded-For': freshAddress() },
  })
  expect(reset.status()).toBe(200)
  await signIn(page, request, 'technicalAdmin')
  await page.goto(adminUrl('/admin/email'))
  const row = page
    .locator('#yop-maillog-title')
    .locator('xpath=ancestor::section')
    .getByRole('row', {
      name: /Passwort zurücksetzen/,
    })
  await expect(row.first()).toContainText(`${email[0]}***@example.test`)
  await expect(row.first()).toContainText('nicht gesendet')
  await expect(page.locator('.yop-page')).not.toContainText(email)
})

test('settings need a code; a failing server is logged and reported; DNS is checked', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000)
  const bogus = {
    smtp: { host: '127.0.0.1', port: 9, fromAddress: 'website@yop.invalid' },
    addresses: { technical: 'technik@yop.invalid' },
    domain: { name: 'yop.invalid', dkimSelector: 'mail' },
  }
  expect((await settings(request, bogus)).status()).toBe(403)
  await confirmStepUp(request, 'technicalAdmin')
  try {
    expect((await settings(request, bogus)).status()).toBe(200)
    const headers = await authHeaders(request, 'technicalAdmin')
    const sent = await request.post(adminUrl('/api/email/test'), { headers })
    expect(sent.status()).toBe(502)
    expect(((await sent.json()) as { code: string }).code).toMatch(/ECONNECTION|ESOCKET/)
    const feed = await request.get(adminUrl('/api/notifications/feed?limit=20'), { headers })
    const items = ((await feed.json()) as { items: { kind: string }[] }).items
    expect(items.map((item) => item.kind)).toContain('emailFailed')

    const dns = await request.get(adminUrl('/api/email/dns'), { headers })
    expect(dns.status()).toBe(200)
    const results = ((await dns.json()) as { results: { key: string; status: string }[] }).results
    expect(results.map((r) => r.key)).toEqual(['mx', 'spf', 'dkim', 'dmarc'])
    // A reserved domain: nothing found (or, without DNS access, the lookup fails) — never "ok".
    for (const result of results) expect(['missing', 'error']).toContain(result.status)

    await signIn(page, request, 'technicalAdmin')
    await page.goto(adminUrl('/admin/email'))
    await expect(page.getByText('127.0.0.1:9')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Zustellbarkeit von yop.invalid' }),
    ).toBeVisible()
    await expect(
      page.locator('#yop-dns-title').locator('xpath=ancestor::section').getByRole('row'),
    ).toHaveCount(5)
    const failed = page
      .locator('#yop-maillog-title')
      .locator('xpath=ancestor::section')
      .getByRole('row', { name: /Test/ })
    await expect(failed.first()).toContainText('fehlgeschlagen')
  } finally {
    // Back to "no mail server" (the code is still fresh).
    expect(
      (
        await settings(request, {
          smtp: { host: null, port: null, fromAddress: null },
          addresses: { technical: null },
          domain: { name: null, dkimSelector: null },
        })
      ).status(),
    ).toBe(200)
  }
})

test('only e-mail managers reach the screen and its actions', async ({ page, request }) => {
  for (const name of ['boardAdmin', 'contentEditor', 'auditor'] as const) {
    const headers = await authHeaders(request, name)
    expect((await request.post(adminUrl('/api/email/test'), { headers })).status(), name).toBe(403)
    expect((await request.get(adminUrl('/api/email/dns'), { headers })).status(), name).toBe(403)
    expect(
      (await request.get(adminUrl('/api/email-log?limit=1'), { headers })).status(),
      name,
    ).toBe(403)
  }
  await signIn(page, request, 'boardAdmin')
  await page.goto(adminUrl('/admin/email'))
  await expect(page.getByText('Dafür fehlt Ihrer Rolle die Berechtigung.')).toBeVisible()
})

for (const [label, theme, language] of [
  ['light, German', 'light', 'de'],
  ['dark, Arabic', 'dark', 'ar'],
] as const) {
  test(`accessibility and phone layout (${label})`, async ({ page, request }) => {
    await page.context().addCookies([{ name: 'payload-theme', value: theme, url: adminUrl('/') }])
    await signIn(page, request, 'technicalAdmin', language)
    await page.goto(adminUrl('/admin/email'))
    await expect(page.locator('.yop-page h1')).toBeVisible()
    await page.locator('.yop-mail-templates summary').first().click()
    const result = await new AxeBuilder({ page }).include('.yop-page').analyze()
    expect(
      result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([])
    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload()
    await expect(page.locator('.yop-page h1')).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  })
}
