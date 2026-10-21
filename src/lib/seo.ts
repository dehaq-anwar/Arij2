import type { Metadata } from 'next'

import { getPathname } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'
import type { Media } from '@/payload-types'

import { indexingAllowed, siteUrl } from './site'

type Href = Parameters<typeof getPathname>[0]['href']

/**
 * Canonical URL plus hreflang alternates for a page that exists in all languages
 * (x-default points to German, the default). Items that are only partly translated pass
 * the locales that actually have them; a language version that only shows the German
 * fallback names the German page as canonical, so search engines see no duplicate.
 */
export function localizedAlternates(
  href: Href,
  locale: Locale,
  available: readonly Locale[] = routing.locales,
): Metadata['alternates'] {
  const path = (l: Locale) => getPathname({ locale: l, href })
  return {
    canonical: path(available.includes(locale) ? locale : routing.defaultLocale),
    languages: {
      ...Object.fromEntries(available.map((l) => [l, path(l)])),
      'x-default': path(routing.defaultLocale),
    },
  }
}

type Seo = {
  metaTitle?: string | null
  metaDescription?: string | null
  ogImage?: number | Media | null
  noIndex?: boolean | null
} | null

/** Absolute address of the sharing version of an image (1200 × 630, see the media collection). */
function shareImage(image: number | Media | null | undefined) {
  if (!image || typeof image === 'number') return undefined
  const og = image.sizes?.og
  const url = og?.url || image.url
  if (!url) return undefined
  const path = new URL(url, 'http://local')
  return {
    url: siteUrl() + path.pathname + path.search,
    width: og?.url ? (og.width ?? 1200) : (image.width ?? undefined),
    height: og?.url ? (og.height ?? 630) : (image.height ?? undefined),
    alt: image.decorative ? '' : (image.alt ?? ''),
  }
}

/**
 * Title, description, language versions, sharing preview (Open Graph) and the search-engine
 * switch of one page. Titles get the site name from the layout's template.
 */
function metadataOf({
  title,
  description,
  seo,
  image,
  href,
  locale,
  available,
  type = 'website',
}: {
  title?: string | null
  description?: string | null
  seo?: Seo
  image?: number | Media | null
  href: Href
  locale: Locale
  available: readonly Locale[]
  type?: 'website' | 'article'
}): Metadata {
  const shownTitle = seo?.metaTitle || title || undefined
  const shownDescription = seo?.metaDescription || description || undefined
  const picture = shareImage(seo?.ogImage || image)
  const alternates = localizedAlternates(href, locale, available)
  return {
    ...(shownTitle ? { title: shownTitle } : {}),
    ...(shownDescription ? { description: shownDescription } : {}),
    alternates,
    openGraph: {
      type,
      locale,
      ...(shownTitle ? { title: shownTitle } : {}),
      ...(shownDescription ? { description: shownDescription } : {}),
      url: typeof alternates?.canonical === 'string' ? alternates.canonical : undefined,
      ...(picture ? { images: [picture] } : {}),
    },
    twitter: { card: picture ? 'summary_large_image' : 'summary' },
    ...(seo?.noIndex ? { robots: { index: false, follow: indexingAllowed() } } : {}),
  }
}

/** A page of the page builder; the home page keeps the site name as its title. */
export function pageMetadata(
  page: { title?: string | null; seo?: Seo | undefined; available: readonly Locale[] },
  href: Href,
  locale: Locale,
  { useTitle = true }: { useTitle?: boolean } = {},
): Metadata {
  return metadataOf({
    title: useTitle ? page.title : null,
    seo: page.seo,
    href,
    locale,
    available: page.available,
  })
}

/** A project, post or event: its summary is the description, its cover the sharing image. */
export function itemMetadata(
  result: {
    doc: {
      title?: string | null
      excerpt?: string | null
      coverImage?: number | Media | null
      seo?: Seo | undefined
    }
    available: readonly Locale[]
  },
  href: Href,
  locale: Locale,
): Metadata {
  return metadataOf({
    title: result.doc.title,
    description: result.doc.excerpt,
    seo: result.doc.seo,
    image: result.doc.coverImage,
    href,
    locale,
    available: result.available,
    type: 'article',
  })
}
