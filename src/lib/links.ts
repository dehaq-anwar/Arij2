import type { getPathname } from '@/i18n/navigation'
import { isSafeUrl } from '@/lib/safe-url'
import { SITE_ROUTES, SYSTEM_PAGE_ROUTES, type SiteRoute, type SystemPage } from '@/lib/site-routes'
import type { Page } from '@/payload-types'

export type Href = Parameters<typeof getPathname>[0]['href']

export type LinkValue = {
  label?: string | null
  kind?: 'route' | 'page' | 'url' | null
  route?: string | null
  page?: number | Page | null
  url?: string | null
}

/**
 * Where a button of the page builder leads: an internal route (the language version is chosen by
 * the link), a page of the builder, or a checked external address. Null if the target is gone
 * (e.g. an unpublished page): then the button is left out instead of leading nowhere.
 */
export function resolveLink(
  link: LinkValue | null | undefined,
): { href: Href; external: false } | { href: string; external: true } | null {
  if (!link) return null
  if (link.kind === 'route' && (SITE_ROUTES as readonly string[]).includes(link.route ?? '')) {
    return { href: link.route as SiteRoute, external: false }
  }
  if (link.kind === 'page' && link.page && typeof link.page === 'object') {
    const page = link.page
    if (page._status && page._status !== 'published') return null
    if (page.systemKey) {
      return { href: SYSTEM_PAGE_ROUTES[page.systemKey as SystemPage], external: false }
    }
    return page.slug
      ? { href: { pathname: '/[slug]', params: { slug: page.slug } }, external: false }
      : null
  }
  if (link.kind === 'url' && isSafeUrl(link.url, { relative: false })) {
    return { href: link.url.trim(), external: true }
  }
  return null
}

/** A menu entry as the header and footer render it (serializable for client components). */
export type MenuEntry = {
  id: string
  label: string
  href: Href | string
  external: boolean
  /** The internal path to compare with the current page ("/about", "/sommerfest"). */
  match: string | null
}

export function menuEntry(link: LinkValue | null | undefined, id: string): MenuEntry | null {
  const target = resolveLink(link)
  const label = link?.label?.trim()
  if (!target || !label) return null
  if (target.external) return { id, label, href: target.href, external: true, match: null }
  const href = target.href
  const match =
    typeof href === 'string'
      ? href
      : 'params' in href && href.params && 'slug' in href.params
        ? `/${String(href.params.slug)}`
        : null
  return { id, label, href, external: false, match }
}
