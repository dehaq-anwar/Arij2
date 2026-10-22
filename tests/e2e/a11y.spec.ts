import AxeBuilder from '@axe-core/playwright'

import { detailPages, locales, routes } from './fixtures'
import { expect, test } from './test'

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`axe (WCAG 2.1 AA), ${colorScheme} theme`, () => {
    // Reduced motion: every element is in its final, visible state when axe checks contrast.
    test.use({ colorScheme, reducedMotion: 'reduce' })

    const paths = [...routes.flatMap((route) => locales.map((l) => route[l])), ...detailPages]
    for (const path of paths) {
      test(path, async ({ page }) => {
        await page.goto(path)
        await page.waitForFunction(() => document.documentElement.hasAttribute('data-motion-ready'))
        const { violations } = await new AxeBuilder({ page }).withTags(tags).analyze()
        const summary = violations.map(
          (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
        )
        expect(summary).toEqual([])
      })
    }

    test('mobile menu (open)', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto('/ar')
      await page.getByRole('button', { name: 'القائمة', exact: true }).click()
      const { violations } = await new AxeBuilder({ page }).withTags(tags).analyze()
      expect(
        violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
      ).toEqual([])
    })
  })
}

// Not part of WCAG A/AA in axe, but a real barrier when reading by headings: every page has one
// h1, and no heading skips a level (an h3 straight under the h1, found by Lighthouse in Phase 6).
test.describe('heading structure', () => {
  const paths = [...routes.flatMap((route) => locales.map((l) => route[l])), ...detailPages]
  for (const path of paths) {
    test(path, async ({ page }) => {
      await page.goto(path)
      const levels = await page
        .locator('main h1, main h2, main h3, main h4, main h5, main h6')
        .evaluateAll((headings) => headings.map((h) => Number(h.tagName.slice(1))))
      expect(levels.filter((level) => level === 1)).toHaveLength(1)
      const skips = levels.flatMap((level, i) =>
        i > 0 && level > levels[i - 1]! + 1 ? [`h${levels[i - 1]} → h${level}`] : [],
      )
      expect(skips).toEqual([])
    })
  }
})

// WCAG 1.4.10 (reflow): at 320 CSS pixels wide (a 1280 px window zoomed to 400 %) every page
// reads without scrolling sideways. Reduced motion, so that intros which slide in from the side
// are measured in their final place, not on the way there.
test.describe('reflow at 320 px', () => {
  test.use({ viewport: { width: 320, height: 256 }, reducedMotion: 'reduce' })
  const paths = [...routes.flatMap((route) => locales.map((l) => route[l])), ...detailPages]
  for (const path of paths) {
    test(path, async ({ page }) => {
      await page.goto(path)
      await page.waitForFunction(() => document.documentElement.hasAttribute('data-motion-ready'))
      const widths = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth,
        window: document.documentElement.clientWidth,
      }))
      expect(widths.page).toBeLessThanOrEqual(widths.window)
    })
  }
})
