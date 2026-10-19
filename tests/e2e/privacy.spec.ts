import { locales, routes } from './fixtures'
import { expect, test } from './test'

test('no cookies and no requests to other hosts on any page', async ({
  page,
  context,
  baseURL,
}) => {
  const ownHost = new URL(baseURL!).host
  const external = new Set<string>()
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.protocol.startsWith('http') && url.host !== ownHost) external.add(url.host)
  })

  for (const route of routes) {
    for (const locale of locales) {
      await page.goto(route[locale], { waitUntil: 'networkidle' })
    }
  }
  // Client-side navigation and the language switcher must not set cookies either.
  await page.goto('/')
  await page
    .getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('link', { name: 'Kontakt' })
    .click()
  await page
    .getByRole('navigation', { name: 'Sprache' })
    .getByRole('link', { name: 'English' })
    .click()
  await expect(page).toHaveURL('/en/contact')

  expect(await context.cookies()).toEqual([])
  expect([...external]).toEqual([])
})
