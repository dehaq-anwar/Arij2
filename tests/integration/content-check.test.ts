import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { unfinishedContent } from '@/lib/content-check'

import { startPayload } from './database'

/**
 * The launch gate on the content (scripts/check-content.ts) against a migrated database: it
 * reports what visitors can see, not drafts nobody has published or partners without permission.
 */
let payload: Payload
let stop: () => Promise<void>

beforeAll(async () => {
  ;({ payload, stop } = await startPayload('contentcheck'))
}, 120_000)

afterAll(async () => {
  await stop?.()
})

describe('unfinished content', () => {
  it('reports published content and visible entries only', async () => {
    const context = { disableRevalidate: true }
    const published = await payload.create({
      collection: 'news',
      locale: 'de',
      data: {
        title: '[PLACEHOLDER: Titel]',
        excerpt: 'Fertig',
        slug: 'gate-published',
        _status: 'published',
      },
      context,
    })
    await payload.create({
      collection: 'news',
      locale: 'de',
      draft: true,
      data: { title: '[PLACEHOLDER: Entwurf]', excerpt: 'x', slug: 'gate-draft', _status: 'draft' },
      context,
    })
    await payload.create({
      collection: 'partners',
      locale: 'de',
      data: { name: '[PLACEHOLDER: Partner]', permissionConfirmed: false },
      context,
    })
    const visible = await payload.create({
      collection: 'partners',
      locale: 'de',
      data: { name: '[ENTWURF] Partner mit Erlaubnis', permissionConfirmed: true },
      context,
    })

    const found = await unfinishedContent(payload)
    const ours = found.filter((item) => /^(news|partners)\//.test(item.where))
    expect(ours).toEqual([
      expect.objectContaining({
        where: `news/${published.id}`,
        path: 'title.de',
        kind: 'placeholder',
      }),
      expect.objectContaining({ where: `partners/${visible.id}`, path: 'name.de', kind: 'draft' }),
    ])
  })
})
