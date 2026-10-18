import type { Metadata } from 'next'

import { getPathname } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'

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
