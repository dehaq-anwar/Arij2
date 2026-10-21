import AxeBuilder from '@axe-core/playwright'
import type { APIRequestContext } from '@playwright/test'

import { authHeaders, signInBrowser } from './auth'
import { adminUrl, freshAddress } from './fixtures'
import type { AccountName } from './secrets'
import { expect, test } from './test'

/**
 * CC-2: the page builder, the live preview, events, search-engine settings and
 * redirects, through the API and in the browser, with the roles that may and may not use them.
 */
test.use({ locale: 'de-DE' })
test.describe.configure({ timeout: 90_000 })

const worker = () => test.info().parallelIndex
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

type Doc = Record<string, unknown> & { id: number }

async function api(
  request: APIRequestContext,
  name: AccountName,
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  data?: unknown,
) {
  const headers = { ...(await authHeaders(request, name)), 'X-Forwarded-For': freshAddress() }
  const response = await request[method](adminUrl(path), { headers, data })
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null
  return { status: response.status(), body }
}

const paragraph = (text: string) => ({
  root: {
    type: 'root',
    version: 1,
    direction: 'ltr',
    format: '',
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: [
          { type: 'text', version: 1, text, format: 0, mode: 'normal', style: '', detail: 0 },
        ],
      },
    ],
  },
})

/** A page with one block of each kind of text, in German. */
const germanLayout = (button: Record<string, unknown> = { kind: 'route', route: '/contact' }) => [
  { blockType: 'header', lead: 'E2E Einleitung des Sommerfests' },
  {
    blockType: 'text',
    surface: 'canvas',
    heading: 'E2E Worum es geht',
    body: paragraph('E2E Text'),
  },
  {
    blockType: 'cards',
    heading: 'E2E Drei Wege',
    numbered: true,
    items: [
      { heading: 'E2E Karte eins', text: paragraph('E2E Erste Karte') },
      { heading: 'E2E Karte zwei', text: paragraph('E2E Zweite Karte') },
    ],
  },
  { blockType: 'quote', quote: 'E2E Frieden beginnt bei uns.', attribution: 'E2E' },
  {
    blockType: 'faq',
    heading: 'E2E Fragen',
    items: [{ question: 'E2E Wann?', answer: paragraph('E2E Im Sommer.') }],
  },
  {
    blockType: 'nightBand',
    heading: 'E2E Mach mit',
    body: paragraph('E2E Komm vorbei.'),
    buttons: [{ label: 'E2E Schreib uns', ...button }],
  },
]

test.describe('the page builder', () => {
  test('a custom page: draft, published, in three languages, only safe content', async ({
    page,
    request,
  }) => {
    const slug = `e2e-sommerfest-${worker()}`
    const created = await api(request, 'contentEditor', 'post', '/api/pages?locale=de&draft=true', {
      title: 'E2E Sommerfest',
      slug,
      layout: germanLayout(),
      _status: 'draft',
    })
    expect(created.status).toBe(201)
    const doc = created.body?.doc as Doc & { layout: Doc[] }

    // A draft is not on the website.
    expect((await request.get(`/${slug}`)).status()).toBe(404)

    const published = await api(
      request,
      'contentEditor',
      'patch',
      `/api/pages/${doc.id}?locale=de`,
      {
        _status: 'published',
      },
    )
    expect(published.status).toBe(200)
    await page.goto(`/${slug}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E Sommerfest')
    const main = page.getByRole('main')
    await expect(main.getByRole('heading', { name: 'E2E Worum es geht' })).toBeVisible()
    await expect(main.getByText('E2E Frieden beginnt bei uns.')).toBeVisible()
    await main.getByText('E2E Wann?').click()
    await expect(main.getByText('E2E Im Sommer.')).toBeVisible()
    await expect(main.getByRole('link', { name: 'E2E Schreib uns' })).toHaveAttribute(
      'href',
      '/kontakt',
    )

    // The same blocks in English and Arabic: only their texts differ.
    // Every language needs its own required texts before it can be published.
    type Block = Doc & { items?: Doc[]; buttons?: Doc[] }
    const saved = (published.body?.doc as { layout: Block[] }).layout
    const translate = (texts: Record<string, string>) =>
      saved.map((block) => {
        switch (block.blockType) {
          case 'header':
            return { ...block, lead: texts.lead }
          case 'text':
            return { ...block, heading: texts.heading, body: paragraph(texts.body!) }
          case 'quote':
            return { ...block, quote: texts.quote }
          case 'faq':
            return {
              ...block,
              items: block.items?.map((item) => ({
                ...item,
                question: texts.question,
                answer: paragraph(texts.answer!),
              })),
            }
          case 'nightBand':
            return {
              ...block,
              heading: texts.band,
              buttons: block.buttons?.map((button) => ({ ...button, label: texts.button })),
            }
          default:
            return block
        }
      })
    const english = translate({
      lead: 'E2E Summer party intro',
      heading: 'E2E What it is about',
      body: 'E2E Text',
      quote: 'E2E Peace begins with us.',
      question: 'E2E When?',
      answer: 'E2E In summer.',
      band: 'E2E Join in',
      button: 'E2E Write to us',
    })
    const arabic = translate({
      lead: 'E2E مقدمة حفل الصيف',
      heading: 'E2E عمّ يدور',
      body: 'E2E نص',
      quote: 'E2E السلام يبدأ منا.',
      question: 'E2E متى؟',
      answer: 'E2E في الصيف.',
      band: 'E2E شارك معنا',
      button: 'E2E اكتب لنا',
    })
    expect(
      (
        await api(request, 'contentEditor', 'patch', `/api/pages/${doc.id}?locale=en`, {
          title: 'E2E Summer party',
          layout: english,
          _status: 'published',
        })
      ).status,
    ).toBe(200)
    expect(
      (
        await api(request, 'contentEditor', 'patch', `/api/pages/${doc.id}?locale=ar`, {
          title: 'E2E حفل الصيف',
          layout: arabic,
          _status: 'published',
        })
      ).status,
    ).toBe(200)
    await page.goto(`/en/${slug}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E Summer party')
    await expect(page.getByRole('main')).toContainText('E2E Summer party intro')
    await expect(page.getByRole('link', { name: 'E2E Write to us' })).toHaveAttribute(
      'href',
      '/en/contact',
    )
    await page.goto(`/ar/${slug}`)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E حفل الصيف')
    const languages = await page
      .locator('link[rel="alternate"][hreflang]')
      .evaluateAll((links) => links.map((l) => l.getAttribute('hreflang')).sort())
    expect(languages).toEqual(['ar', 'de', 'en', 'x-default'])

    // Rules: unsafe links, reserved addresses and a missing page opening are refused.
    for (const url of ['javascript:alert(1)', 'data:text/html,x', 'vbscript:x']) {
      const refused = await api(
        request,
        'contentEditor',
        'patch',
        `/api/pages/${doc.id}?locale=de`,
        {
          layout: germanLayout({ kind: 'url', url }),
        },
      )
      expect(refused.status, url).toBe(400)
    }
    for (const reserved of ['kontakt', 'projects', 'admin', 'veranstaltungen']) {
      const refused = await api(request, 'contentEditor', 'post', '/api/pages?locale=de', {
        title: 'E2E Reserviert',
        slug: reserved,
        layout: germanLayout(),
        _status: 'published',
      })
      expect(refused.status, reserved).toBe(400)
    }
    const noOpening = await api(request, 'contentEditor', 'post', '/api/pages?locale=de', {
      title: 'E2E Ohne Kopf',
      slug: `e2e-ohne-kopf-${worker()}`,
      layout: germanLayout().slice(1),
      _status: 'published',
    })
    expect(noOpening.status).toBe(400)
    expect(JSON.stringify(noOpening.body)).toContain('Inhalt der Seite')
    await page.goto(`/${slug}`)
    expect(await page.content()).not.toMatch(/javascript:|vbscript:|data:text/)
  })

  test('only content editors build pages; fixed pages cannot be deleted', async ({ request }) => {
    for (const name of ['auditor', 'technicalAdmin', 'membershipManager'] as const) {
      const attempt = await api(request, name, 'post', '/api/pages?locale=de', {
        title: 'E2E Verboten',
        slug: `e2e-verboten-${name.toLowerCase()}-${worker()}`,
        layout: germanLayout(),
        _status: 'published',
      })
      expect(attempt.status, name).toBe(403)
    }
    const home = await api(
      request,
      'contentEditor',
      'get',
      '/api/pages?where[systemKey][equals]=home&depth=0',
    )
    const id = (home.body?.docs as Doc[])[0]!.id
    const deleted = await api(request, 'superAdmin', 'delete', `/api/pages/${id}`)
    expect(deleted.status).not.toBe(200)
    expect((await api(request, 'contentEditor', 'get', `/api/pages/${id}?depth=0`)).status).toBe(
      200,
    )
    // The form stays on its page.
    const membership = await api(
      request,
      'contentEditor',
      'get',
      '/api/pages?where[systemKey][equals]=membership&depth=0',
    )
    const form = (membership.body?.docs as (Doc & { layout: Doc[] })[])[0]!
    const withoutForm = await api(request, 'contentEditor', 'patch', `/api/pages/${form.id}`, {
      layout: form.layout.filter((block) => block.blockType !== 'membershipForm'),
    })
    expect(withoutForm.status).toBe(400)
  })

  test('the builder in the Control Center: blocks with previews, no code', async ({
    page,
    request,
  }) => {
    await signInBrowser(page.context(), request, 'contentEditor')
    await page.goto(adminUrl('/admin/collections/pages/create'))
    await page
      .getByRole('button', { name: /Block hinzufügen/ })
      .first()
      .click()
    const drawer = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('heading', { name: 'Block hinzufügen' }) })
    await expect(drawer).toBeVisible()
    for (const name of ['Seitenkopf', 'Text', 'Karten', 'Fragen und Antworten', 'Nachtband']) {
      await expect(drawer.getByText(name, { exact: true }).first()).toBeVisible()
    }
    await expect(drawer.locator('img[src*="/admin/blocks/"]').first()).toBeVisible()
    await expect(drawer.getByText('Seitenanfang', { exact: true })).toBeVisible()
  })

  test('two language menus, interface and content; on a phone they fit the screen', async ({
    page,
    request,
  }) => {
    const created = await api(request, 'contentEditor', 'post', '/api/pages?locale=de', {
      title: 'E2E Sprachen',
      slug: `e2e-sprachen-${worker()}`,
      layout: germanLayout(),
      _status: 'published',
    })
    const id = (created.body?.doc as Doc).id
    await signInBrowser(page.context(), request, 'contentEditor')
    const interfaceMenu = page.getByRole('button', { name: 'Oberfläche: Deutsch' })
    const contentMenu = page.locator('.app-header__localizer')
    await page.goto(adminUrl(`/admin/collections/pages/${id}`))
    await expect(interfaceMenu).toBeVisible()
    await expect(contentMenu).toContainText('Inhaltssprache')
    // Screens whose data have no languages show only the interface language.
    await page.goto(adminUrl('/admin'))
    await expect(interfaceMenu).toBeVisible()
    await expect(contentMenu).toBeHidden()

    await page.setViewportSize({ width: 390, height: 844 })
    const fits = (path: string) =>
      expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), {
          message: path,
        })
        .toBe(true)
    for (const path of ['/admin/collections/pages', `/admin/collections/pages/${id}`]) {
      await page.goto(adminUrl(path))
      await expect(interfaceMenu).toBeVisible()
      await expect(contentMenu).toBeVisible()
      await fits(path)
    }
    // Right to left too (lists, and a screen with a rich-text editor).
    await page.context().addCookies([{ name: 'payload-lng', value: 'ar', url: adminUrl('/') }])
    for (const path of ['/admin/collections/pages', '/admin/globals/legal-notice']) {
      await page.goto(adminUrl(path))
      // Payload writes it as "RTL".
      await expect(page.locator('html')).toHaveAttribute('dir', /^rtl$/i)
      await fits(path)
    }
  })
})

test.describe('live preview', () => {
  test('drafts are previewed on the Control Center’s host, only for those who may see them', async ({
    page,
    request,
  }) => {
    const slug = `e2e-vorschau-${worker()}`
    const created = await api(request, 'contentEditor', 'post', '/api/pages?locale=de&draft=true', {
      title: 'E2E Vorschau Entwurf',
      slug,
      layout: germanLayout(),
      _status: 'draft',
    })
    const id = (created.body?.doc as Doc).id
    // Not on the website's host, not without signing in.
    expect((await request.get(`/preview/pages/${id}`)).status()).toBe(404)
    expect((await request.get(adminUrl(`/preview/pages/${id}`))).status()).toBe(404)

    await signInBrowser(page.context(), request, 'contentEditor')
    const response = await page.goto(adminUrl(`/preview/pages/${id}`))
    expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'self'")
    expect(response?.headers()['x-frame-options']).toBe('SAMEORIGIN')
    expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E Vorschau Entwurf')
    await expect(page.getByRole('status')).toContainText('Vorschau des Entwurfs')

    // In the editor: the preview next to the form follows each saved change.
    await page.goto(adminUrl(`/admin/collections/pages/${id}`))
    await page.locator('#live-preview-toggler').click()
    const frame = page.frameLocator(`iframe[src$="/preview/pages/${id}"]`)
    await expect(frame.getByRole('heading', { level: 1 })).toHaveText('E2E Vorschau Entwurf', {
      timeout: 30_000,
    })
    const title = page.locator('#field-title')
    await title.fill('E2E Vorschau geändert')
    await expect(frame.getByRole('heading', { level: 1 })).toHaveText('E2E Vorschau geändert', {
      timeout: 30_000,
    })
    // Still a draft: the website shows nothing.
    expect((await request.get(`/${slug}`)).status()).toBe(404)
  })

  test('people without content access get no preview', async ({ browser, request }) => {
    const created = await api(request, 'contentEditor', 'post', '/api/pages?locale=de&draft=true', {
      title: 'E2E Vorschau gesperrt',
      slug: `e2e-gesperrt-${worker()}`,
      layout: germanLayout(),
      _status: 'draft',
    })
    const id = (created.body?.doc as Doc).id
    const context = await browser.newContext()
    await signInBrowser(context, request, 'membershipManager')
    const page = await context.newPage()
    expect((await page.goto(adminUrl(`/preview/pages/${id}`)))?.status()).toBe(404)
    await context.close()
  })
})

test.describe('events', () => {
  test('upcoming and past events, the event page and its calendar file', async ({
    page,
    request,
  }) => {
    const day = 24 * 60 * 60 * 1000
    const soon = new Date(Date.now() + 10 * day)
    soon.setUTCHours(16, 0, 0, 0)
    const upcoming = await api(request, 'contentEditor', 'post', '/api/events?locale=de', {
      title: `E2E Sommerfest ${worker()}`,
      slug: `e2e-fest-${worker()}`,
      excerpt: 'E2E Ein Fest für alle.',
      startsAt: soon.toISOString(),
      endsAt: new Date(soon.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      location: 'E2E Gemeindehaus, Kiel',
      registrationUrl: 'https://example.org/anmeldung',
      _status: 'published',
    })
    expect(upcoming.status).toBe(201)
    expect(
      (
        await api(request, 'contentEditor', 'post', '/api/events?locale=de', {
          title: `E2E Rückblick ${worker()}`,
          slug: `e2e-rueckblick-${worker()}`,
          excerpt: 'E2E War schön.',
          startsAt: new Date(Date.now() - 30 * day).toISOString(),
          _status: 'published',
        })
      ).status,
    ).toBe(201)
    expect(
      (
        await api(request, 'contentEditor', 'post', '/api/events?locale=de', {
          title: 'E2E Falsch',
          excerpt: 'E2E',
          startsAt: soon.toISOString(),
          endsAt: new Date(soon.getTime() - 1000).toISOString(),
          _status: 'published',
        })
      ).status,
    ).toBe(400)

    await page.goto('/veranstaltungen')
    const upcomingSection = page.getByRole('region', { name: 'Kommende Veranstaltungen' })
    const pastSection = page.getByRole('region', { name: 'Vergangene Veranstaltungen' })
    await expect(
      upcomingSection.getByRole('link', { name: `E2E Sommerfest ${worker()}` }),
    ).toBeVisible()
    await expect(pastSection.getByRole('link', { name: `E2E Rückblick ${worker()}` })).toBeVisible()
    const { violations } = await new AxeBuilder({ page }).withTags(tags).analyze()
    expect(violations.map((v) => v.id)).toEqual([])

    await upcomingSection.getByRole('link', { name: `E2E Sommerfest ${worker()}` }).click()
    await expect(page).toHaveURL(`/veranstaltungen/e2e-fest-${worker()}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`E2E Sommerfest ${worker()}`)
    const time = (value: Date) =>
      new Intl.DateTimeFormat('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Berlin',
      }).format(value)
    await expect(page.getByRole('main')).toContainText(
      `${time(soon)} – ${time(new Date(soon.getTime() + 3 * 60 * 60 * 1000))}`,
    )
    await expect(page.getByRole('link', { name: 'Zur Anmeldung' })).toHaveAttribute(
      'href',
      'https://example.org/anmeldung',
    )

    const ics = await request.get(`/calendar/e2e-fest-${worker()}.ics?lang=de`)
    expect(ics.status()).toBe(200)
    expect(ics.headers()['content-type']).toContain('text/calendar')
    const calendar = await ics.text()
    expect(calendar).toContain('BEGIN:VEVENT')
    expect(calendar).toContain(`SUMMARY:E2E Sommerfest ${worker()}`)
    expect(calendar).toContain(`DTSTART:${soon.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`)
    expect(calendar).toContain('LOCATION:E2E Gemeindehaus\\, Kiel')
    expect((await request.get('/calendar/gibt-es-nicht.ics')).status()).toBe(404)

    await page.goto(`/ar/events/e2e-fest-${worker()}`)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })
})

test.describe('search engines, sharing and redirects', () => {
  test('page settings: title, description, sharing, hidden from search engines', async ({
    page,
    request,
  }) => {
    const slug = `e2e-seo-${worker()}`
    const created = await api(request, 'contentEditor', 'post', '/api/pages?locale=de', {
      title: 'E2E Seite',
      slug,
      layout: germanLayout(),
      seo: { metaTitle: 'E2E Suchtitel', metaDescription: 'E2E Beschreibung für Suchmaschinen' },
      _status: 'published',
    })
    expect(created.status).toBe(201)
    await page.goto(`/${slug}`)
    await expect(page).toHaveTitle('E2E Suchtitel – Youth of Peace e.V.')
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'E2E Beschreibung für Suchmaschinen',
    )
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'E2E Suchtitel',
    )
    let sitemap = await (await request.get('/sitemap.xml')).text()
    expect(sitemap).toContain(`/${slug}</loc>`)

    const id = (created.body?.doc as Doc).id
    await api(request, 'contentEditor', 'patch', `/api/pages/${id}?locale=de`, {
      seo: { noIndex: true },
    })
    await page.goto(`/${slug}`)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    sitemap = await (await request.get('/sitemap.xml')).text()
    expect(sitemap).not.toContain(`/${slug}</loc>`)
  })

  test('redirects lead old addresses on, only where there is no page', async ({ request }) => {
    const from = `/e2e-alte-seite-${worker()}`
    const permanent = await api(request, 'contentEditor', 'post', '/api/redirects', {
      from,
      to: { kind: 'route', route: '/contact' },
      permanent: true,
    })
    expect(permanent.status).toBe(201)
    // Next.js repeats the Location header on the first, uncached answer; browsers follow it.
    const location = (headers: Record<string, string>) => [
      ...new Set((headers['location'] ?? '').split(/,\s*/)),
    ]
    let response = await request.get(from, { maxRedirects: 0 })
    expect(response.status()).toBe(308)
    expect(location(response.headers())).toEqual(['/kontakt'])

    const temporary = await api(request, 'contentEditor', 'post', '/api/redirects', {
      from: `/en/e2e-old-${worker()}`,
      to: { kind: 'route', route: '/support' },
      permanent: false,
    })
    expect(temporary.status).toBe(201)
    response = await request.get(`/en/e2e-old-${worker()}`, { maxRedirects: 0 })
    expect(response.status()).toBe(307)
    expect(location(response.headers())).toEqual(['/en/support'])

    // A fixed page is never redirected, and visitors cannot read the list.
    expect(
      (
        await api(request, 'contentEditor', 'post', '/api/redirects', {
          from: '/kontakt',
          to: { kind: 'route', route: '/' },
        })
      ).status,
    ).toBe(400)
    expect((await request.get(adminUrl('/api/redirects'))).status()).toBe(403)
    for (const name of ['membershipManager', 'technicalAdmin'] as const) {
      expect((await api(request, name, 'get', '/api/redirects')).status, name).toBe(403)
    }
  })
})
