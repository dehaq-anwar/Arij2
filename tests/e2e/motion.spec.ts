import { expect, test, type Page } from '@playwright/test'

type MotionDebug = { scrollTriggers: () => number; tweens: () => number }

const motion = (page: Page) =>
  page.evaluate(() => {
    const debug = (window as unknown as { __yopMotion: MotionDebug }).__yopMotion
    return { scrollTriggers: debug.scrollTriggers(), tweens: debug.tweens() }
  })

/** horizontal translation (px) of an element's current transform */
const translateX = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41)

const opacity = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => Number(getComputedStyle(el).opacity))

const waitForMotion = (page: Page) =>
  page.waitForFunction(() => document.documentElement.hasAttribute('data-motion-ready'))

/** Reveals already in view at load play for ≤ 1 s; count only once they have finished. */
const settled = async (page: Page) => {
  await page.waitForTimeout(1200)
  return motion(page)
}

test.describe('with motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('Lenis smooth scrolling is active', async ({ page }) => {
    await page.goto('/')
    await waitForMotion(page)
    await expect(page.locator('html')).toHaveClass(/\blenis\b/)
  })

  test('below-the-fold content starts hidden and is revealed on scroll', async ({ page }) => {
    await page.goto('/')
    await waitForMotion(page)
    const cards = '[data-stagger-item]'
    expect(await opacity(page, cards)).toBe(0)
    await page.locator(cards).first().scrollIntoViewIfNeeded()
    await expect.poll(() => opacity(page, cards)).toBe(1)
  })

  test('"slide-start" comes from the left in German and from the right in Arabic', async ({
    page,
  }) => {
    const slide = '[data-reveal="slide-start"]'
    await page.goto('/')
    await waitForMotion(page)
    expect(await translateX(page, slide)).toBeLessThan(0)

    await page.goto('/ar')
    await waitForMotion(page)
    expect(await translateX(page, slide)).toBeGreaterThan(0)

    await page.locator(slide).scrollIntoViewIfNeeded()
    await expect.poll(() => translateX(page, slide)).toBe(0)
  })

  test('animations are cleaned up on route changes (no leaks)', async ({ page }) => {
    // Reference: the number of live animations on a fresh load of each page.
    await page.goto('/ueber-uns')
    await waitForMotion(page)
    const about = await settled(page)
    await page.goto('/')
    await waitForMotion(page)
    const home = await settled(page)
    expect(home.scrollTriggers).toBeGreaterThan(0)

    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' })
    const legal = page.getByRole('navigation', { name: 'Rechtliches' })
    const triggers = async () => (await motion(page)).scrollTriggers
    for (let round = 0; round < 3; round++) {
      await nav.getByRole('link', { name: 'Über uns' }).click()
      await expect(page).toHaveURL('/ueber-uns')
      await expect.poll(triggers).toBe(about.scrollTriggers)
      // The legal notice has no animations: nothing from the previous pages may survive.
      await legal.getByRole('link', { name: 'Impressum' }).click()
      await expect(page).toHaveURL('/impressum')
      await expect.poll(triggers).toBe(0)
      await page.getByRole('banner').getByRole('link', { name: 'Youth of Peace e.V.' }).click()
      await expect(page).toHaveURL('/')
      await expect.poll(triggers).toBe(home.scrollTriggers)
    }
    expect(await settled(page)).toEqual(home)
  })
})

test.describe('with prefers-reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('no smooth scrolling and all content visible immediately', async ({ page }) => {
    await page.goto('/')
    await waitForMotion(page)
    await expect(page.locator('html')).not.toHaveClass(/\blenis\b/)
    expect(await opacity(page, '[data-stagger-item]')).toBe(1)
    expect(await opacity(page, '[data-reveal]')).toBe(1)
    expect(await translateX(page, '[data-reveal="slide-start"]')).toBe(0)
    expect((await motion(page)).scrollTriggers).toBe(0)
  })
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('all content is visible', async ({ page }) => {
    await page.goto('/')
    expect(await opacity(page, '[data-stagger-item]')).toBe(1)
    expect(await opacity(page, '[data-reveal]')).toBe(1)
  })
})
