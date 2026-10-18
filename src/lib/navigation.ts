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
