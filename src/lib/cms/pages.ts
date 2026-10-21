import type { Where } from 'payload'
import { cache } from 'react'

import { legacyPages, systemPageData } from '@/cms/pages/system-pages'
import { routing, type Locale } from '@/i18n/routing'
import type { SystemPage } from '@/lib/site-routes'
import type { Page } from '@/payload-types'

import { getPayloadClient } from './payload'

/**
 * Pages of the page builder for visitors: published only (the collection's read access), in the
 * visitor's language with German as the fallback, images and linked pages populated.
 */
const visitor = { overrideAccess: false } as const

export type PageView = Pick<Page, 'id' | 'title' | 'layout' | 'seo' | 'updatedAt'> & {
  /** Languages that have their own title (for hreflang). */
  available: readonly Locale[]
}

async function titlesByLocale(id: number) {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'pages',
    locale: 'all',
    where: { id: { equals: id } },
    select: { title: true },
    limit: 1,
    depth: 0,
    ...visitor,
  })
  const byLocale = ((docs[0] as { title?: unknown } | undefined)?.title ?? {}) as Partial<
    Record<Locale, string | null>
  >
  return routing.locales.filter((l) => Boolean(byLocale[l]?.trim()))
}

async function findPage(where: Where, locale: Locale) {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'pages',
    locale,
    fallbackLocale: 'de',
    where,
    limit: 1,
    depth: 2,
    ...visitor,
  })
  return (docs[0] as Page | undefined) ?? null
}

/**
 * One of the five fixed pages. Until it exists as a published page (the first start after the
 * update builds it), it is shown from its former texts, exactly as before.
 */
export const getSystemPage = cache(async (key: SystemPage, locale: Locale): Promise<PageView> => {
  const page = await findPage({ systemKey: { equals: key } }, locale)
  if (page) return { ...page, available: await titlesByLocale(page.id) }
  const payload = await getPayloadClient()
  const [german, own] = await Promise.all([
    legacyPages(payload, 'de'),
    legacyPages(payload, locale, { fallback: true }),
  ])
  const data = systemPageData(key, german, own, locale)
  return {
    id: 0,
    title: data.title,
    layout: data.layout as Page['layout'],
    seo: undefined,
    updatedAt: '',
    available: routing.locales,
  }
})

/** A page with its own address (/<slug>); null if there is none or it is not published. */
export const getCustomPage = cache(
  async (slug: string, locale: Locale): Promise<PageView | null> => {
    const page = await findPage(
      { and: [{ slug: { equals: slug } }, { systemKey: { exists: false } }] },
      locale,
    )
    return page ? { ...page, available: await titlesByLocale(page.id) } : null
  },
)

/** Slugs and languages of all published custom pages (for the sitemap). */
export async function getCustomPageSlugs() {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'pages',
    locale: 'all',
    where: { and: [{ systemKey: { exists: false } }, { 'seo.noIndex': { not_equals: true } }] },
    select: { slug: true, title: true, updatedAt: true },
    limit: 1000,
    depth: 0,
    pagination: false,
    ...visitor,
  })
  return docs.map((doc) => {
    const byLocale = (doc.title ?? {}) as unknown as Partial<Record<Locale, string | null>>
    return {
      slug: doc.slug ?? '',
      updatedAt: doc.updatedAt,
      available: routing.locales.filter((l) => Boolean(byLocale[l]?.trim())),
    }
  })
}
