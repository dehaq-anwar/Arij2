import { cache } from 'react'

import { normalizePath } from '@/cms/collections/Redirects'
import { getPathname } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'
import { resolveLink, type LinkValue } from '@/lib/links'

import { getPayloadClient } from './payload'

/**
 * The redirect for an address the website does not know (CC-2), if the editors set one up:
 * where it leads, in the language of the old address, and whether it is permanent.
 */
export const findRedirect = cache(
  async (path: string): Promise<{ location: string; permanent: boolean } | null> => {
    const from = normalizePath(path)
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'redirects',
      where: { from: { equals: from } },
      limit: 1,
      depth: 1,
      // Visitors may not list the redirects; only the one for this address is used.
      overrideAccess: true,
    })
    const redirect = docs[0]
    if (!redirect) return null
    const prefix = from.split('/')[1]
    const locale: Locale = prefix === 'en' || prefix === 'ar' ? prefix : routing.defaultLocale
    const target = resolveLink({ ...(redirect.to as LinkValue), label: 'redirect' })
    if (!target) return null
    const location = target.external ? target.href : getPathname({ locale, href: target.href })
    if (normalizePath(location) === from) return null
    return { location, permanent: redirect.permanent !== false }
  },
)

/** The address as the visitor typed it, from the route's locale and path segments. */
export const visitedPath = (locale: Locale, segments: string[]) =>
  `${locale === routing.defaultLocale ? '' : `/${locale}`}/${segments.join('/')}`
