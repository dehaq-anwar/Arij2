import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { startPayload } from './database'

/**
 * Publishing on a real database (CC-2): scheduled publications run only for people who may
 * still edit content; redirects cannot loop or hide pages; the menu stays within the design;
 * events cannot end before they start.
 */
let payload: Payload
let stop: () => Promise<void>

beforeAll(async () => {
  const started = await startPayload('publishing')
  payload = started.payload
  stop = started.stop
})
afterAll(async () => stop?.())

const header = { blockType: 'header' }
const person = (role: string, name: string) =>
  payload.create({
    collection: 'users',
    data: {
      name,
      email: `${name.toLowerCase()}@example.test`,
      password: 'integration-password-1234',
      role: role as never,
    },
    context: { serverCommand: true },
  })
const errorOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'saved',
    (error: Error) => error.message + JSON.stringify((error as { data?: unknown }).data ?? ''),
  )

describe('scheduled publication', () => {
  const schedule = async (pageId: number, userId: number) => {
    await payload.jobs.queue({
      task: 'schedulePublish',
      waitUntil: new Date(Date.now() - 1000),
      input: {
        type: 'publish',
        doc: { relationTo: 'pages', value: String(pageId) },
        user: { relationTo: 'users', value: userId },
      } as never,
    })
    await payload.jobs.run({ queue: 'default' })
  }
  const draft = (title: string) =>
    payload.create({
      collection: 'pages',
      draft: true,
      data: { title, slug: title.toLowerCase(), layout: [header], _status: 'draft' } as never,
    })
  const status = async (id: number) =>
    (await payload.findByID({ collection: 'pages', id, depth: 0 }))._status

  it('publishes when the person who scheduled it may still edit content', async () => {
    const editor = await person('contentEditor', 'Redaktion')
    const page = await draft('Geplant')
    expect(await status(page.id)).toBe('draft')
    await schedule(page.id, editor.id)
    expect(await status(page.id)).toBe('published')
    const { docs } = await payload.find({
      collection: 'audit-log',
      where: { action: { equals: 'content.scheduled' } },
      depth: 0,
    })
    expect(docs.at(-1)).toMatchObject({
      actorId: editor.id,
      targetType: 'pages',
      targetId: String(page.id),
    })
  })

  it('is not carried out for someone without the right (or deactivated since)', async () => {
    const auditor = await person('auditor', 'Pruefung')
    const page = await draft('Verweigert')
    await schedule(page.id, auditor.id)
    expect(await status(page.id)).toBe('draft')

    const editor = await person('contentEditor', 'Ehemalig')
    await payload.update({
      collection: 'users',
      id: editor.id,
      data: { disabled: true },
      context: { serverCommand: true },
    })
    const second = await draft('Deaktiviert')
    await schedule(second.id, editor.id)
    expect(await status(second.id)).toBe('draft')
    const { totalDocs } = await payload.count({
      collection: 'audit-log',
      where: { action: { equals: 'content.scheduleRefused' } },
    })
    expect(totalDocs).toBe(2)
  })
})

describe('redirects', () => {
  const redirect = (from: string, to: Record<string, unknown>) =>
    errorOf(
      payload.create({ collection: 'redirects', data: { from, to, permanent: true } as never }),
    )

  it('are stored in one spelling; fixed pages and the Control Center cannot be redirected', async () => {
    expect(await redirect('/Alte-Seite/', { kind: 'route', route: '/contact' })).toBe('saved')
    const { docs } = await payload.find({ collection: 'redirects', depth: 0 })
    expect(docs.map((doc) => doc.from)).toContain('/alte-seite')
    for (const from of ['/kontakt', '/en/contact', '/ar/about', '/admin/x', '/api/users']) {
      expect(await redirect(from, { kind: 'route', route: '/' }), from).not.toBe('saved')
    }
    expect(await redirect('/alte-seite', { kind: 'route', route: '/' })).not.toBe('saved')
  })

  it('cannot lead in a circle, also through other redirects', async () => {
    process.env.SERVER_URL = 'https://verein.example'
    expect(await redirect('/a', { kind: 'url', url: 'https://verein.example/b' })).toBe('saved')
    expect(await redirect('/b', { kind: 'url', url: 'https://verein.example/c' })).toBe('saved')
    expect(await redirect('/c', { kind: 'url', url: 'https://verein.example/a' })).toMatch(
      /im Kreis/,
    )
    expect(await redirect('/d', { kind: 'url', url: 'https://verein.example/d' })).toMatch(
      /im Kreis/,
    )
    expect(await redirect('/e', { kind: 'url', url: 'javascript:alert(1)' })).not.toBe('saved')
  })
})

describe('the menu', () => {
  it('starts as the usual menu, at most six short entries that fit one line', async () => {
    const { ensureNavigation } = await import('@/cms/globals/Navigation')
    expect(await ensureNavigation(payload)).toBe(true)
    expect(await ensureNavigation(payload)).toBe(false)
    const nav = await payload.findGlobal({ slug: 'navigation', locale: 'de', depth: 0 })
    expect(nav.main?.map((entry) => entry.label)).toEqual([
      'Über uns',
      'Projekte',
      'Aktuelles',
      'Unterstützen',
      'Kontakt',
    ])
    const entry = (labelText: string) => ({ label: labelText, kind: 'route', route: '/about' })
    const save = (main: unknown[]) =>
      errorOf(payload.updateGlobal({ slug: 'navigation', locale: 'de', data: { main } as never }))
    expect(await save(Array.from({ length: 7 }, () => entry('Kurz')))).not.toBe('saved')
    expect(await save([entry('Ein viel zu langer Menüpunkt')])).not.toBe('saved')
    expect(await save(Array.from({ length: 6 }, () => entry('Zwölf Zeichen')))).toMatch(
      /zusammen zu lang/,
    )
    expect(await save(Array.from({ length: 6 }, () => entry('Neun Zei.')))).toBe('saved')
  })
})

describe('events', () => {
  it('cannot end before they start; registration links must be safe', async () => {
    const base = {
      title: 'Sommerfest',
      excerpt: 'Ein Fest.',
      startsAt: '2027-06-20T16:00:00.000Z',
      _status: 'published',
    }
    expect(
      await errorOf(
        payload.create({
          collection: 'events',
          data: { ...base, endsAt: '2027-06-20T15:00:00.000Z' } as never,
        }),
      ),
    ).toMatch(/Ende liegt vor dem Beginn/)
    expect(
      await errorOf(
        payload.create({
          collection: 'events',
          data: { ...base, registrationUrl: 'javascript:alert(1)' } as never,
        }),
      ),
    ).not.toBe('saved')
    const event = await payload.create({
      collection: 'events',
      data: { ...base, endsAt: '2027-06-20T20:00:00.000Z' } as never,
    })
    expect(event.slug).toBe('sommerfest')
  })
})
