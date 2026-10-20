import { authHeaders, signInBrowser } from './auth'
import { adminUrl, freshAddress } from './fixtures'
import { expect, test } from './test'

const expectedHeaders: Record<string, string | RegExp> = {
  'content-security-policy': /^default-src 'self'; .*frame-ancestors 'none'.*form-action 'self'$/,
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  'cross-origin-opener-policy': 'same-origin',
}

test('security headers on pages, forms, the API, the CMS and files', async ({ request }) => {
  for (const path of [
    '/',
    '/ar/membership',
    '/kontakt',
    '/robots.txt',
    adminUrl('/api/projects'),
    adminUrl('/admin'),
    adminUrl('/admin/login'),
  ]) {
    const response = await request.get(path, { maxRedirects: 0 })
    const headers = response.headers()
    for (const [name, value] of Object.entries(expectedHeaders)) {
      if (typeof value === 'string') expect(headers[name], `${name} on ${path}`).toBe(value)
      else expect(headers[name], `${name} on ${path}`).toMatch(value)
    }
    expect(headers['x-powered-by'], path).toBeUndefined()
  }
  expect(
    (await request.get(adminUrl('/admin/login'), { maxRedirects: 0 })).headers()['x-robots-tag'],
  ).toBe('noindex, nofollow')
})

test('the content security policy allows our own origin only', async ({ request }) => {
  const csp = (await request.get('/')).headers()['content-security-policy']!
  // No CDN, font service, analytics or embed (this also blocks the CMS code editor's CDN).
  expect(csp).not.toMatch(/https?:|\*/)
  // The production build needs no eval.
  expect(csp).not.toContain('unsafe-eval')
})

test.describe('CMS accounts', () => {
  test('there is no sign-up, also not via the first-user endpoint', async ({ request }) => {
    const data = {
      name: 'Intruder',
      email: 'intruder@example.test',
      password: 'long-enough-password',
    }
    expect((await request.post(adminUrl('/api/users'), { data })).status()).toBe(403)
    expect((await request.post(adminUrl('/api/users/first-register'), { data })).status()).toBe(403)
  })

  test('sign-in attempts are limited per address', async ({ request }) => {
    const headers = { 'X-Forwarded-For': freshAddress() }
    const statuses: number[] = []
    for (let i = 0; i < 21; i++) {
      const response = await request.post(adminUrl('/api/users/login'), {
        headers,
        data: { email: `nobody-${i}@example.test`, password: 'wrong-password-123' },
      })
      statuses.push(response.status())
    }
    expect(statuses.slice(0, 20)).toEqual(Array(20).fill(401))
    expect(statuses[20]).toBe(429)
  })

  test('passwords need at least 12 characters', async ({ request }) => {
    const headers = await authHeaders(request, 'boardAdmin')
    const { user } = (await (await request.get(adminUrl('/api/users/me'), { headers })).json()) as {
      user: { id: number }
    }
    const response = await request.patch(adminUrl(`/api/users/${user.id}`), {
      headers,
      data: { password: 'elevenchars' },
    })
    expect(response.status()).toBe(400)
  })
})

test('the CMS loads nothing from other hosts and violates no CSP rule', async ({
  page,
  request,
}) => {
  const ownHost = new URL(adminUrl('/')).host
  const external = new Set<string>()
  const violations: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.protocol.startsWith('http') && url.host !== ownHost) external.add(url.host)
  })
  page.on('console', (message) => {
    if (/Content Security Policy/i.test(message.text())) violations.push(message.text())
  })

  await signInBrowser(page.context(), request, 'boardAdmin')
  for (const path of [
    '/admin',
    '/admin/security',
    '/admin/collections/membership-applications',
    '/admin/collections/contact-messages',
  ]) {
    await page.goto(adminUrl(path), { waitUntil: 'networkidle' })
    await expect(page.locator('#nav-membership-applications')).toBeVisible()
  }
  // Job queue and rate-limit counters are not part of the editors' navigation.
  await expect(page.locator('nav a[href*="payload-jobs"], nav a[href*="rate-limit"]')).toHaveCount(
    0,
  )

  await page.context().clearCookies()
  await signInBrowser(page.context(), request, 'contentEditor')
  // The rich-text editor of a project and the upload view.
  await page.goto(adminUrl('/admin/collections/projects'), { waitUntil: 'networkidle' })
  await page.getByRole('link', { name: 'E2E Testprojekt' }).first().click()
  await expect(page.locator('[data-lexical-editor="true"]').first()).toBeVisible()
  await page.waitForLoadState('networkidle')
  // Editors do not see applications and messages.
  await expect(page.locator('nav a[href*="membership-applications"]')).toHaveCount(0)

  expect(violations).toEqual([])
  expect([...external]).toEqual([])
})
