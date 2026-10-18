import { expect, test } from '@playwright/test'

test('the current section is marked in the main navigation', async ({ page }) => {
  await page.goto('/projekte')
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' })
  await expect(nav.getByRole('link', { name: 'Projekte' })).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('[aria-current]')).toHaveCount(1)
})

test('the skip link is the first focus stop and moves focus to the main content', async ({
  page,
}) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Zum Inhalt springen' })
  await expect(skip).toBeFocused()
  await expect(skip).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.locator('main#main')).toBeFocused()
})

test.describe('mobile menu', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('opens as a dialog, closes with Escape and returns focus', async ({ page }) => {
    await page.goto('/')
    const button = page.getByRole('button', { name: 'Menü', exact: true })
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await button.click()
    const dialog = page.getByRole('dialog', { name: 'Menü' })
    await expect(dialog).toBeVisible()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(button).toBeFocused()
  })

  test('closes when a link is followed', async ({ page }) => {
    await page.goto('/ar')
    await page.getByRole('button', { name: 'القائمة', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'القائمة' })
    await dialog.getByRole('link', { name: 'من نحن' }).click()
    await expect(page).toHaveURL('/ar/about')
    await expect(dialog).toBeHidden()
  })

  test('the header shows logo and menu button only, without overflow', async ({ page }) => {
    for (const path of ['/', '/en', '/ar']) {
      await page.goto(path)
      const banner = page.getByRole('banner')
      // The membership button lives in the menu on phones, not in the header bar.
      await expect(
        banner.getByRole('link', { name: /Mitglied werden|Become a member|كن عضوًا/ }),
      ).toBeHidden()
      const box = await banner.getByRole('link', { name: 'Youth of Peace e.V.' }).boundingBox()
      expect(box?.height).toBeLessThan(56) // name on one line
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true)
    }
  })

  test('the language bar stays reachable without opening the menu', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('navigation', { name: 'Sprache' }).getByRole('link', { name: 'العربية' }),
    ).toBeVisible()
  })
})
