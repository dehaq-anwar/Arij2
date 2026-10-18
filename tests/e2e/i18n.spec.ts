import { expect, test } from '@playwright/test'

import { dirOf, languageName, languageNav, locales, routes } from './fixtures'

test.describe('every page in every language', () => {
  for (const route of routes) {
    for (const locale of locales) {
      test(`${route[locale]} (${locale})`, async ({ page }) => {
        const response = await page.goto(route[locale])
        expect(response?.status()).toBe(200)
        await expect(page.locator('html')).toHaveAttribute('lang', locale)
        await expect(page.locator('html')).toHaveAttribute('dir', dirOf(locale))
        await expect(page.locator('h1')).toHaveCount(1)
      })
    }
  }
})

test('the language switcher links to the same page in each language', async ({ page }) => {
  for (const route of routes) {
    for (const locale of locales) {
      await page.goto(route[locale])
      const nav = page.getByRole('navigation', { name: languageNav[locale] })
      await expect(nav.locator('[aria-current="true"]')).toHaveText(languageName[locale])
      for (const other of locales.filter((l) => l !== locale)) {
        const link = nav.getByRole('link', { name: languageName[other] })
        await expect(link).toHaveAttribute('href', route[other])
        await expect(link).toHaveAttribute('hreflang', other)
        await expect(link).toHaveAttribute('lang', other)
      }
    }
  }
})

test('switching languages keeps the visitor on the equivalent page', async ({ page }) => {
  await page.goto('/ueber-uns')
  await page
    .getByRole('navigation', { name: 'Sprache' })
    .getByRole('link', { name: 'English' })
    .click()
  await expect(page).toHaveURL('/en/about')
  await page
    .getByRole('navigation', { name: 'Language' })
    .getByRole('link', { name: 'العربية' })
    .click()
  await expect(page).toHaveURL('/ar/about')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page
    .getByRole('navigation', { name: 'اللغة' })
    .getByRole('link', { name: 'Deutsch' })
    .click()
  await expect(page).toHaveURL('/ueber-uns')
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
})

test('paths of the wrong language redirect to the localized path', async ({ page }) => {
  await page.goto('/about')
  await expect(page).toHaveURL('/ueber-uns')
  await page.goto('/en/ueber-uns')
  await expect(page).toHaveURL('/en/about')
  await page.goto('/de/kontakt')
  await expect(page).toHaveURL('/kontakt')
})

test('hreflang alternates and canonical point to the localized paths', async ({ page }) => {
  await page.goto('/en/about')
  const href = (selector: string) => page.locator(selector).getAttribute('href')
  expect(await href('link[rel="canonical"]')).toMatch(/\/en\/about$/)
  expect(await href('link[rel="alternate"][hreflang="de"]')).toMatch(/\/ueber-uns$/)
  expect(await href('link[rel="alternate"][hreflang="en"]')).toMatch(/\/en\/about$/)
  expect(await href('link[rel="alternate"][hreflang="ar"]')).toMatch(/\/ar\/about$/)
  expect(await href('link[rel="alternate"][hreflang="x-default"]')).toMatch(/\/ueber-uns$/)
})

test.describe('404 page', () => {
  const cases = [
    { path: '/gibt-es-nicht', locale: 'de', title: 'Seite nicht gefunden' },
    { path: '/en/does-not-exist', locale: 'en', title: 'Page not found' },
    { path: '/ar/does-not-exist', locale: 'ar', title: 'الصفحة غير موجودة' },
  ] as const

  for (const { path, locale, title } of cases) {
    test(`${path} answers 404 and shows the localized page`, async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBe(404)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
      await expect(page.locator('html')).toHaveAttribute('dir', dirOf(locale))
      await expect(page.getByRole('banner')).toBeVisible()
      await expect(page.getByRole('contentinfo')).toBeVisible()
    })
  }
})
