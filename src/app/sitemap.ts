import type { MetadataRoute } from 'next'

import { getPathname } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'
import { getCustomPageSlugs } from '@/lib/cms/pages'
import { getAllItemSlugs } from '@/lib/cms/queries'
import { siteUrl } from '@/lib/site'

// Reads the CMS, so it is built per request (there is no database at build time).
export const dynamic = 'force-dynamic'

type Href = Parameters<typeof getPathname>[0]['href']

const staticPages = [
  '/',
  '/about',
  '/projects',
  '/news',
  '/events',
  '/membership',
  '/support',
  '/contact',
  '/legal-notice',
  '/privacy',
] as const

/** One entry per language version, each listing all versions as alternates (hreflang). */
function entries(href: Href, locales: readonly Locale[], lastModified?: string) {
  const url = (locale: Locale) => siteUrl() + getPathname({ locale, href })
  const languages = Object.fromEntries(locales.map((l) => [l, url(l)]))
  return locales.map((locale) => ({
    url: url(locale),
    lastModified,
    alternates: { languages },
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, news, events, pages] = await Promise.all([
    getAllItemSlugs('projects'),
    getAllItemSlugs('news'),
    getAllItemSlugs('events'),
    getCustomPageSlugs(),
  ])
  return [
    ...staticPages.flatMap((page) => entries(page, routing.locales)),
    // Pages of the page builder and events, like the items: only where they are translated.
    ...pages.flatMap(({ slug, updatedAt, available }) =>
      entries({ pathname: '/[slug]', params: { slug } }, available, updatedAt),
    ),
    ...events.flatMap(({ slug, updatedAt, available }) =>
      entries({ pathname: '/events/[slug]', params: { slug } }, available, updatedAt),
    ),
    // Items appear only in the languages they are translated into (no fallback duplicates).
    ...projects.flatMap(({ slug, updatedAt, available }) =>
      entries({ pathname: '/projects/[slug]', params: { slug } }, available, updatedAt),
    ),
    ...news.flatMap(({ slug, updatedAt, available }) =>
      entries({ pathname: '/news/[slug]', params: { slug } }, available, updatedAt),
    ),
  ]
}
