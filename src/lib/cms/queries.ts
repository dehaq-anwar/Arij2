import type { GlobalSlug, Where } from 'payload'
import { cache } from 'react'

import { routing, type Locale } from '@/i18n/routing'
import type {
  Config,
  Event,
  FocusArea,
  News,
  Partner,
  Project,
  Statistic,
  TeamMember,
} from '@/payload-types'

import { getPayloadClient } from './payload'

/**
 * All queries run with overrideAccess: false, so the collections' access rules apply exactly as
 * for an anonymous visitor (published projects/news only, people with consent only, …).
 * Missing translations fall back to German; callers learn whether an item is really translated.
 */
const visitor = { overrideAccess: false } as const

export type Localized<T> = { doc: T; translated: boolean }

export const getGlobal = cache(
  async <S extends GlobalSlug>(slug: S, locale: Locale): Promise<Config['globals'][S]> => {
    const payload = await getPayloadClient()
    return payload.findGlobal({
      slug,
      locale,
      fallbackLocale: 'de',
      depth: 1,
      ...visitor,
    }) as Promise<Config['globals'][S]>
  },
)

type ItemCollection = 'projects' | 'news' | 'events'
type ItemDoc<C extends ItemCollection> = C extends 'projects'
  ? Project
  : C extends 'news'
    ? News
    : Event

/** IDs of documents that have their own title in `locale` (i.e. are translated). */
async function translatedIds(collection: ItemCollection, locale: Locale, ids: number[]) {
  if (locale === routing.defaultLocale || !ids.length) return new Set(ids)
  const payload = await getPayloadClient()
  const own = await payload.find({
    collection,
    locale,
    fallbackLocale: false,
    where: { id: { in: ids } },
    select: { title: true },
    limit: ids.length,
    depth: 0,
    pagination: false,
    ...visitor,
  })
  return new Set(
    own.docs.filter((d) => typeof d.title === 'string' && d.title.trim()).map((d) => d.id),
  )
}

async function findItems<C extends ItemCollection>(
  collection: C,
  locale: Locale,
  {
    limit = 100,
    where,
    sort = '-publishedAt',
  }: { limit?: number; where?: Where; sort?: string } = {},
): Promise<Localized<ItemDoc<C>>[]> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection,
    locale,
    fallbackLocale: 'de',
    where,
    sort,
    limit,
    depth: 1,
    ...visitor,
  })
  const docs = result.docs as unknown as ItemDoc<C>[]
  const translated = await translatedIds(
    collection,
    locale,
    docs.map((d) => d.id),
  )
  return docs.map((doc) => ({ doc, translated: translated.has(doc.id) }))
}

export const getProjects = cache((locale: Locale) => findItems('projects', locale))
export const getNews = cache((locale: Locale, limit?: number) =>
  findItems('news', locale, { limit }),
)

/** One project/news item by slug, plus the languages that have their own translation (for hreflang). */
async function findItemBySlug<C extends ItemCollection>(
  collection: C,
  slug: string,
  locale: Locale,
) {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection,
    locale,
    fallbackLocale: 'de',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
    ...visitor,
  })
  const doc = result.docs[0] as ItemDoc<C> | undefined
  if (!doc) return null
  const titles = await payload.find({
    collection,
    locale: 'all',
    where: { id: { equals: doc.id } },
    select: { title: true },
    limit: 1,
    depth: 0,
    ...visitor,
  })
  const first = titles.docs[0] as { title?: unknown } | undefined
  const byLocale = (first?.title ?? {}) as Partial<Record<Locale, string | null>>
  const available = routing.locales.filter((l) => Boolean(byLocale[l]?.trim()))
  return { doc, translated: available.includes(locale), available }
}

/**
 * Events that have not ended yet (soonest first), or those that have (latest first). "Now" is
 * the moment of rendering; cached pages are rendered again whenever the CMS changes.
 */
export const getUpcomingEvents = cache((locale: Locale, limit = 100) => {
  const now = new Date().toISOString()
  return findItems('events', locale, {
    limit,
    sort: 'startsAt',
    where: {
      or: [
        { endsAt: { greater_than_equal: now } },
        { and: [{ endsAt: { exists: false } }, { startsAt: { greater_than_equal: now } }] },
      ],
    },
  })
})
export const getPastEvents = cache((locale: Locale, limit = 24) => {
  const now = new Date().toISOString()
  return findItems('events', locale, {
    limit,
    sort: '-startsAt',
    where: {
      or: [
        { endsAt: { less_than: now } },
        { and: [{ endsAt: { exists: false } }, { startsAt: { less_than: now } }] },
      ],
    },
  })
})
export const getEvent = cache((slug: string, locale: Locale) =>
  findItemBySlug('events', slug, locale),
)

export const getProject = cache((slug: string, locale: Locale) =>
  findItemBySlug('projects', slug, locale),
)
export const getNewsPost = cache((slug: string, locale: Locale) =>
  findItemBySlug('news', slug, locale),
)

export const getFocusAreas = cache(async (locale: Locale): Promise<FocusArea[]> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'focus-areas',
    locale,
    fallbackLocale: 'de',
    sort: 'order',
    limit: 20,
    depth: 0,
    ...visitor,
  })
  return docs
})

export const getHomeStatistics = cache(async (locale: Locale): Promise<Statistic[]> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'statistics',
    locale,
    fallbackLocale: 'de',
    where: { showOnHome: { equals: true } },
    sort: 'order',
    limit: 8,
    depth: 0,
    ...visitor,
  })
  return docs
})

export const getBoard = cache(async (locale: Locale): Promise<TeamMember[]> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'team-members',
    locale,
    fallbackLocale: 'de',
    where: { group: { equals: 'board' } },
    sort: 'order',
    limit: 50,
    depth: 1,
    ...visitor,
  })
  return docs
})

export const getPartners = cache(async (locale: Locale): Promise<Partner[]> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'partners',
    locale,
    fallbackLocale: 'de',
    sort: 'order',
    limit: 100,
    depth: 1,
    ...visitor,
  })
  return docs
})

/**
 * Slugs and per-language availability of all published items (for the sitemap), without those
 * hidden from search engines.
 */
export async function getAllItemSlugs(collection: ItemCollection) {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection,
    locale: 'all',
    where: { 'seo.noIndex': { not_equals: true } },
    select: { slug: true, title: true, updatedAt: true },
    limit: 1000,
    depth: 0,
    pagination: false,
    ...visitor,
  })
  return docs.map((d) => {
    const byLocale = (d.title ?? {}) as unknown as Partial<Record<Locale, string | null>>
    return {
      slug: d.slug,
      updatedAt: d.updatedAt,
      available: routing.locales.filter((l) => Boolean(byLocale[l]?.trim())),
    }
  })
}

type FormTextValues = {
  membership: {
    principles?: string | null
    fees?: string | null
    guardian?: string | null
    consent?: string | null
  }
  contact: { consent?: string | null }
}

/**
 * The wording inside the forms (declarations, consents). Since CC-2 in its own global; until the
 * first start of the new version has moved it there, still from the former page globals.
 */
export const getFormTexts = cache(async (locale: Locale): Promise<FormTextValues> => {
  const texts = await getGlobal('form-texts', locale)
  if (texts.updatedAt) {
    return { membership: texts.membership ?? {}, contact: texts.contact ?? {} }
  }
  const [membership, contact] = await Promise.all([
    getGlobal('membership-page', locale),
    getGlobal('contact-page', locale),
  ])
  return { membership: membership.form ?? {}, contact: { consent: contact.form?.consent ?? null } }
})
