import { locales, routes } from './fixtures'
import { expect, test } from './test'

test('no cookies and no requests to other hosts on any page', async ({
  page,
  context,
  baseURL,
}) => {
  // 30 pages, each until the network is idle: about 1 s per page, more under parallel load
  // (it took 28.6 s against the default 30 s limit). The checks below are about cookies and
  // other hosts, not speed; loading times are tested in control-center.spec.ts and Lighthouse.
  test.setTimeout(90_000)
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
