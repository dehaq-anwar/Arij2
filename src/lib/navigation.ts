/** Site navigation. Labels live in the "Navigation" messages; hrefs are internal route names. */
export const mainNav = [
  { href: '/about', key: 'about' },
  { href: '/projects', key: 'projects' },
  { href: '/news', key: 'news' },
  { href: '/support', key: 'support' },
  { href: '/contact', key: 'contact' },
] as const

export const membershipLink = { href: '/membership', key: 'membership' } as const

export const legalNav = [
  { href: '/legal-notice', key: 'legalNotice' },
  { href: '/privacy', key: 'privacy' },
] as const

export type NavItem = (typeof mainNav)[number] | typeof membershipLink | (typeof legalNav)[number]

/**
 * Pages rendered per request (the forms) are not prefetched: otherwise every page view would
 * render them on the server in the background. They load when the link is followed.
 */
export const prefetchFor = (href: unknown) =>
  href === '/contact' || href === '/membership' ? false : undefined
