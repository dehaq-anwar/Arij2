import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['de', 'en', 'ar'],
  defaultLocale: 'de',
  // German lives at "/", the other languages under "/en" and "/ar".
  localePrefix: 'as-needed',
  // No Accept-Language redirects and no NEXT_LOCALE cookie: visitors get zero cookies.
  localeDetection: false,
  localeCookie: false,
  // hreflang is emitted per page in metadata (only for locales that really have the content).
  alternateLinks: false,
  // Internal route names (= folder names) are English; German gets German paths.
  // Arabic uses Latin paths, because Arabic URLs become unreadable %-sequences when shared.
  pathnames: {
    '/': '/',
    '/about': { de: '/ueber-uns', en: '/about', ar: '/about' },
    '/projects': { de: '/projekte', en: '/projects', ar: '/projects' },
    '/projects/[slug]': { de: '/projekte/[slug]', en: '/projects/[slug]', ar: '/projects/[slug]' },
    '/news': { de: '/aktuelles', en: '/news', ar: '/news' },
    '/news/[slug]': { de: '/aktuelles/[slug]', en: '/news/[slug]', ar: '/news/[slug]' },
    '/membership': { de: '/mitglied-werden', en: '/membership', ar: '/membership' },
    '/support': { de: '/unterstuetzen', en: '/support', ar: '/support' },
    '/contact': { de: '/kontakt', en: '/contact', ar: '/contact' },
    '/legal-notice': { de: '/impressum', en: '/legal-notice', ar: '/legal-notice' },
    '/privacy': { de: '/datenschutz', en: '/privacy', ar: '/privacy' },
  },
})

export type Locale = (typeof routing.locales)[number]
