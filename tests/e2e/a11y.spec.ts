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
