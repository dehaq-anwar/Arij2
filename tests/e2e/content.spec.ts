import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

import { languageName, languageNav, testData } from './fixtures'

const alternates = async (page: Page) =>
  Object.fromEntries(
    await page
      .locator('link[rel="alternate"][hreflang]')
      .evaluateAll((links) =>
        links.map((l) => [l.getAttribute('hreflang'), new URL(l.getAttribute('href')!).pathname]),
      ),
  )
const canonical = async (page: Page) =>
  new URL((await page.locator('link[rel="canonical"]').getAttribute('href'))!).pathname

test.describe('projects', () => {
  test('the list shows published projects only', async ({ page }) => {
    await page.goto('/projekte')
    const main = page.getByRole('main')
    await expect(main.getByRole('link', { name: 'E2E Testprojekt' })).toBeVisible()
    await expect(main.getByRole('link', { name: 'E2E Nur Deutsch' })).toBeVisible()
    await expect(main).not.toContainText('E2E Unveröffentlicht')
  })

  test('an unpublished project answers 404', async ({ page }) => {
    const response = await page.goto(testData.unpublishedProject)
    expect(response?.status()).toBe(404)
  })

  test('a translated project is shown in the visitor’s language', async ({ page }) => {
    await page.goto(testData.translatedProject.ar)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('مشروع اختبار E2E')
    await expect(page.getByRole('note')).toHaveCount(0)
    await expect(page.getByRole('definition').filter({ hasText: 'جارٍ' })).toBeVisible()
    expect(await canonical(page)).toBe(testData.translatedProject.ar)
    expect(await alternates(page)).toEqual({
      de: testData.translatedProject.de,
      en: testData.translatedProject.en,
      ar: testData.translatedProject.ar,
      'x-default': testData.translatedProject.de,
    })
  })

  test('an untranslated project falls back to German, marked as such', async ({ page }) => {
    await page.goto(testData.germanOnlyProject.ar)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toHaveText('E2E Nur Deutsch')
    await expect(heading).toHaveAttribute('lang', 'de')
    await expect(page.getByRole('note')).toContainText('غير متوفر بالعربية')
    // No duplicate content for search engines: the German page is canonical, and only
    // languages that really have the text are listed as alternates.
    expect(await canonical(page)).toBe(testData.germanOnlyProject.de)
    expect(await alternates(page)).toEqual({
      de: testData.germanOnlyProject.de,
      'x-default': testData.germanOnlyProject.de,
    })
  })

  test('the language switcher keeps the project', async ({ page }) => {
    await page.goto(testData.translatedProject.de)
    const nav = page.getByRole('navigation', { name: languageNav.de })
    await expect(nav.getByRole('link', { name: languageName.en })).toHaveAttribute(
      'href',
      testData.translatedProject.en,
    )
    await nav.getByRole('link', { name: languageName.ar }).click()
    await expect(page).toHaveURL(testData.translatedProject.ar)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('مشروع اختبار E2E')
  })
})

test.describe('news', () => {
  test('a post shows its date and related projects', async ({ page }) => {
    await page.goto(testData.post.de)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E Testbeitrag')
    await expect(page.locator('time')).toHaveText('Veröffentlicht am 1. Oktober 2026')
    await page.getByRole('link', { name: 'E2E Testprojekt' }).click()
    await expect(page).toHaveURL(testData.translatedProject.de)
  })

  test('English has its own translation, Arabic falls back to German', async ({ page }) => {
    await page.goto(testData.post.en)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E Test post')
    await expect(page.getByRole('note')).toHaveCount(0)
    await page.goto(testData.post.ar)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E Testbeitrag')
    await expect(page.getByRole('note')).toBeVisible()
    // Dates use Western digits in Arabic (plan §18 Q8).
    await expect(page.locator('time')).toContainText('2026')
  })

  test('the home page lists the latest posts', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByRole('link', { name: 'E2E Test post' })).toBeVisible()
  })
})

test.describe('privacy and editorial rules', () => {
  test('statistics show value and date, never the internal source', async ({ page }) => {
    await page.goto('/')
    const stat = page.getByRole('definition').filter({ hasText: '1.234' })
    await expect(stat).toBeVisible()
    await expect(page.getByRole('main')).toContainText('Stand: 30. September 2026')
    expect(await page.content()).not.toContain('E2E interne Quelle')
  })

  test('people appear only with consent, partners only with permission', async ({ page }) => {
    await page.goto('/ueber-uns')
    await expect(page.getByRole('main')).toContainText('E2E Mit Einwilligung')
    expect(await page.content()).not.toContain('E2E Ohne Einwilligung')
    await page.goto('/unterstuetzen')
    await expect(page.getByRole('main')).toContainText('E2E Partner bestätigt')
    expect(await page.content()).not.toContain('E2E Partner unbestätigt')
  })

  test('the API gives visitors the same view as the pages', async ({ request }) => {
    const json = async (path: string) => {
      const response = await request.get(path)
      expect(response.status(), path).toBe(200)
      return JSON.stringify(await response.json())
    }
    expect(await json('/api/projects?limit=100')).not.toContain('e2e-unveroeffentlicht')
    expect(await json('/api/team-members?limit=100')).not.toContain('Ohne Einwilligung')
    expect(await json('/api/partners?limit=100')).not.toContain('unbestätigt')
    const stats = await json('/api/statistics?limit=100')
    expect(stats).toContain('E2E Kennzahl')
    expect(stats).not.toContain('E2E interne Quelle')
    expect((await request.get('/api/users')).status()).toBeGreaterThanOrEqual(401)
  })

  test('the donation section makes no tax claims', async ({ page }) => {
    for (const path of ['/unterstuetzen', '/en/support', '/ar/support']) {
      await page.goto(path)
      await expect(page.getByRole('main')).not.toContainText(
        /absetzbar|Zuwendungsbestätigung|Spendenquittung|deductible|donation receipt|خصم ضريبي/i,
      )
    }
  })

  test('missing content is visibly marked as a placeholder', async ({ page }) => {
    await page.goto('/impressum')
    await expect(page.locator('main [data-placeholder="placeholder"]').first()).toBeVisible()
    await page.goto('/mitglied-werden')
    await expect(page.locator('main [data-placeholder="draft"]').first()).toContainText('[ENTWURF]')
  })

  test('the footer links the contact address from the CMS', async ({ page }) => {
    await page.goto('/en')
    await expect(
      page.getByRole('contentinfo').getByRole('link', { name: 'info@yop-ye.org' }),
    ).toHaveAttribute('href', 'mailto:info@yop-ye.org')
  })
})

test.describe('changes in the CMS are published immediately', () => {
  const signIn = async (request: APIRequestContext) => {
    const login = await request.post('/api/users/login', { data: testData.editor })
    expect(login.status()).toBe(200)
    const { token } = (await login.json()) as { token: string }
    return { Authorization: `JWT ${token}` }
  }

  test('page texts', async ({ page, request }) => {
    await page.goto('/kontakt') // cached from here on
    const officeHours = `E2E Sprechzeit ${Date.now()}`
    const update = await request.post('/api/globals/contact-page?locale=de', {
      headers: await signIn(request),
      data: { officeHours },
    })
    expect(update.status()).toBe(200)
    await page.goto('/kontakt')
    await expect(page.getByRole('main')).toContainText(officeHours)
  })

  test('new and deleted projects', async ({ page, request }) => {
    const headers = await signIn(request)
    await page.goto('/projekte') // cached from here on
    const title = `E2E Neu ${Date.now()}`
    const created = await request.post('/api/projects?locale=de', {
      headers,
      data: { title, excerpt: 'E2E', stage: 'planned', _status: 'published' },
    })
    expect(created.status()).toBe(201)
    const { doc } = (await created.json()) as { doc: { id: number } }
    await page.goto('/projekte')
    await expect(page.getByRole('link', { name: title })).toBeVisible()
    expect((await request.delete(`/api/projects/${doc.id}`, { headers })).status()).toBe(200)
    await page.goto('/projekte')
    await expect(page.getByRole('main')).not.toContainText(title)
  })
})

test.describe('search engines', () => {
  test('are kept out until launch', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text()
    expect(robots).toMatch(/Disallow: \/\s*$/m)
  })

  test('the sitemap lists each item only in its translated languages', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text()
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname)
    expect(locs).toEqual(
      expect.arrayContaining([
        '/',
        '/en/about',
        '/ar/privacy',
        ...Object.values(testData.translatedProject),
        testData.germanOnlyProject.de,
        testData.post.de,
        testData.post.en,
      ]),
    )
    expect(locs).not.toContain(testData.germanOnlyProject.ar)
    expect(locs).not.toContain(testData.post.ar)
    expect(locs).not.toContain(testData.unpublishedProject)
  })
})
