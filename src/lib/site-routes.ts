/**
 * The website's fixed pages that buttons and links in the page builder can point to (internal
 * route names as in src/i18n/routing.ts; the language version is chosen when rendering).
 */
export const SITE_ROUTES = [
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
export type SiteRoute = (typeof SITE_ROUTES)[number]

/** Their names in the admin (the website itself uses the "Navigation" messages). */
export const SITE_ROUTE_LABELS: Record<SiteRoute, { de: string; en: string; ar: string }> = {
  '/': { de: 'Startseite', en: 'Home page', ar: 'الصفحة الرئيسية' },
  '/about': { de: 'Über uns', en: 'About us', ar: 'من نحن' },
  '/projects': { de: 'Projekte', en: 'Projects', ar: 'المشاريع' },
  '/news': { de: 'Aktuelles', en: 'News', ar: 'الأخبار' },
  '/events': { de: 'Veranstaltungen', en: 'Events', ar: 'الفعاليات' },
  '/membership': { de: 'Mitglied werden', en: 'Membership', ar: 'العضوية' },
  '/support': { de: 'Unterstützen', en: 'Support us', ar: 'ادعمنا' },
  '/contact': { de: 'Kontakt', en: 'Contact', ar: 'تواصل معنا' },
  '/legal-notice': { de: 'Impressum', en: 'Legal notice', ar: 'بيانات الناشر' },
  '/privacy': { de: 'Datenschutz', en: 'Privacy', ar: 'الخصوصية' },
}

/** The fixed pages that are edited in the page builder ("system pages"). */
export const SYSTEM_PAGES = ['home', 'about', 'membership', 'support', 'contact'] as const
export type SystemPage = (typeof SYSTEM_PAGES)[number]

export const SYSTEM_PAGE_ROUTES: Record<SystemPage, SiteRoute> = {
  home: '/',
  about: '/about',
  membership: '/membership',
  support: '/support',
  contact: '/contact',
}
