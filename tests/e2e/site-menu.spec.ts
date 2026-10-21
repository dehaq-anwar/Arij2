import type { APIRequestContext } from '@playwright/test'

import { authHeaders } from './auth'
import { adminUrl, freshAddress } from './fixtures'
import type { AccountName } from './secrets'
import { expect, test } from './test'

/**
 * CC-2: the website's menu, edited in the Control Center. It changes the menu for every page,
 * so this project runs after all other tests (playwright.config.ts).
 */
test.use({ locale: 'de-DE' })
test.describe.configure({ timeout: 90_000 })

type Doc = Record<string, unknown> & { id: number }

async function api(
  request: APIRequestContext,
  name: AccountName,
  method: 'get' | 'post',
  path: string,
  data?: unknown,
) {
  const headers = { ...(await authHeaders(request, name)), 'X-Forwarded-For': freshAddress() }
  const response = await request[method](adminUrl(path), { headers, data })
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null
  return { status: response.status(), body }
}

test.describe('the menu', () => {
  test('editors change the menu; it stays on one line; the legal links stay', async ({
    page,
    request,
  }) => {
    // The menu as it is, in every language (its rows keep their ids when written back).
    const original: Record<string, Doc[]> = {}
    for (const locale of ['de', 'en', 'ar']) {
      const nav = await api(
        request,
        'contentEditor',
        'get',
        `/api/globals/navigation?locale=${locale}&depth=0`,
      )
      original[locale] = (nav.body?.main ?? []) as Doc[]
    }
    const longest = [
      { label: 'Über uns', kind: 'route', route: '/about' },
      { label: 'Projekte', kind: 'route', route: '/projects' },
      { label: 'Veranstaltungen', kind: 'route', route: '/events' },
      { label: 'Aktuelles', kind: 'route', route: '/news' },
      { label: 'Unterstützen', kind: 'route', route: '/support' },
      { label: 'Kontakt', kind: 'route', route: '/contact' },
    ]
    try {
      expect(
        (
          await api(request, 'contentEditor', 'post', '/api/globals/navigation?locale=de', {
            main: [...longest, { label: 'E2E zu viel', kind: 'route', route: '/' }],
          })
        ).status,
      ).toBe(400)
      expect(
        (
          await api(request, 'contentEditor', 'post', '/api/globals/navigation?locale=de', {
            main: longest,
          })
        ).status,
      ).toBe(200)
      // Wide enough: one line, nothing cut off, no sideways scrolling.
      await page.setViewportSize({ width: 1440, height: 800 })
      await page.goto('/')
      const nav = page.getByRole('navigation', { name: 'Hauptnavigation' })
      const menuButton = page.getByRole('button', { name: 'Menü', exact: true })
      await expect(nav.getByRole('link', { name: 'Veranstaltungen' })).toBeVisible()
      await expect(menuButton).toBeHidden()
      const boxes = await nav
        .getByRole('link')
        .evaluateAll((items) => items.map((item) => item.getBoundingClientRect()))
      expect(new Set(boxes.map((box) => Math.round(box.top))).size).toBe(1)
      expect(new Set(boxes.map((box) => Math.round(box.height))).size).toBe(1)
      const cta = page.getByRole('banner').getByRole('link', { name: 'Mitglied werden' })
      const ctaBox = (await cta.boundingBox())!
      expect(Math.max(...boxes.map((box) => box.right))).toBeLessThanOrEqual(ctaBox.x)
      const noSideways = () => document.documentElement.scrollWidth <= innerWidth
      expect(await page.evaluate(noSideways)).toBe(true)
      // Too narrow for it: the menu button instead of a broken line, with every entry inside.
      await page.setViewportSize({ width: 1024, height: 800 })
      await expect(menuButton).toBeVisible()
      await expect(nav).toBeHidden()
      expect(await page.evaluate(noSideways)).toBe(true)
      await menuButton.click()
      const dialog = page.getByRole('dialog', { name: 'Menü' })
      await expect(dialog.getByRole('link', { name: 'Veranstaltungen' })).toBeVisible()
      await expect(dialog.getByRole('link', { name: 'Mitglied werden' })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      const footer = page.getByRole('contentinfo')
      await expect(footer.getByRole('link', { name: 'Impressum' })).toBeVisible()
      await expect(footer.getByRole('link', { name: 'Datenschutz' })).toBeVisible()
      await expect(footer.getByRole('link', { name: 'Veranstaltungen' })).toBeVisible()
    } finally {
      for (const locale of ['de', 'en', 'ar']) {
        await api(request, 'contentEditor', 'post', `/api/globals/navigation?locale=${locale}`, {
          main: original[locale],
        })
      }
    }
  })
})
