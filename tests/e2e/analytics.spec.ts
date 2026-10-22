import AxeBuilder from '@axe-core/playwright'
import type { APIRequestContext, Page } from '@playwright/test'

import { authHeaders, signInBrowser } from './auth'
import { adminUrl } from './fixtures'
import type { AccountName } from './secrets'
import { expect, test } from './test'

/**
 * Visitor statistics (CC-4) from the stand-in agent's counts (tests/e2e/fake-agent.ts: every
 * complete hour of the last two days, with one 404 address and one server error at 09:00 UTC).
 */
async function signIn(page: Page, request: APIRequestContext, name: AccountName, lang = 'de') {
  await page.context().addCookies([{ name: 'payload-lng', value: lang, url: adminUrl('/') }])
  await signInBrowser(page.context(), request, name)
}

test.beforeEach(async ({ request }) => {
  // Counting is idempotent (an hour counted again replaces itself), so every worker may run it.
  const response = await request.post(adminUrl('/api/operations/jobs/run'), {
    headers: await authHeaders(request, 'technicalAdmin'),
    data: { task: 'analytics-collect' },
  })
  expect(response.status()).toBe(200)
})

test('the statistics screen: totals, pages, languages, sources, 404 and errors', async ({
  page,
  request,
}) => {
  await signIn(page, request, 'boardAdmin')
  await page.goto(adminUrl('/admin/analytics?range=7'))
  await expect(page.getByRole('heading', { level: 1, name: 'Statistik' })).toBeVisible()
  await expect(page.getByRole('link', { name: '7 Tage' })).toHaveAttribute('aria-current', 'page')
  const stats = page.locator('.yop-grid--stats')
  await expect(stats).not.toContainText(/Seitenaufrufe\s*0\b/)
  await expect(page.locator('figure.yop-chart .yop-daybars__day')).toHaveCount(7)
  const pages = page.locator('#yop-toppages-title').locator('xpath=ancestor::section')
  await expect(pages.getByRole('row').nth(1)).toContainText('/')
  await expect(page.getByText('duckduckgo.com')).toBeVisible()
  await expect(page.getByText('/projekt-alt')).toBeVisible()
  await expect(page.getByText('/en/news/x')).toBeVisible()
  // The board reads content but does not write it: no "create redirect".
  await expect(page.getByRole('link', { name: /Weiterleitung anlegen/ })).toHaveCount(0)
  await expect(page.getByText(/Suchmaschinen sind bis zum Start ausgesperrt/)).toBeVisible()
})

test('"create redirect" opens the redirect form with the address filled in', async ({
  page,
  request,
}) => {
  await signIn(page, request, 'superAdmin')
  await page.goto(adminUrl('/admin/analytics'))
  await page.getByRole('link', { name: 'Weiterleitung anlegen: /projekt-alt' }).click()
  await expect(page).toHaveURL(/\/admin\/collections\/redirects\/create/)
  await expect(page.locator('input[name="from"]')).toHaveValue('/projekt-alt')
})

test('roles without the statistics permission see neither menu nor numbers', async ({
  page,
  request,
}) => {
  for (const name of ['contentEditor', 'membershipManager'] as const) {
    const response = await request.get(adminUrl('/api/access-stats?limit=1'), {
      headers: await authHeaders(request, name),
    })
    expect(response.status(), name).toBe(403)
  }
  await signIn(page, request, 'membershipManager')
  await page.goto(adminUrl('/admin/analytics'))
  await expect(page.getByText('Dafür fehlt Ihrer Rolle die Berechtigung.')).toBeVisible()
  await expect(page.locator('aside.yop-nav')).not.toContainText('Statistik')
})

for (const [label, theme, language] of [
  ['light, German', 'light', 'de'],
  ['dark, Arabic', 'dark', 'ar'],
] as const) {
  test(`accessibility and phone layout (${label})`, async ({ page, request }) => {
    await page.context().addCookies([{ name: 'payload-theme', value: theme, url: adminUrl('/') }])
    await signIn(page, request, 'auditor', language)
    await page.goto(adminUrl('/admin/analytics'))
    await expect(page.locator('.yop-page h1')).toBeVisible()
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
