export const locales = ['de', 'en', 'ar'] as const
export type Locale = (typeof locales)[number]

/** Every page with its public path per language (German without prefix). */
export const routes = [
  { key: 'home', de: '/', en: '/en', ar: '/ar' },
  { key: 'about', de: '/ueber-uns', en: '/en/about', ar: '/ar/about' },
  { key: 'projects', de: '/projekte', en: '/en/projects', ar: '/ar/projects' },
  { key: 'news', de: '/aktuelles', en: '/en/news', ar: '/ar/news' },
  { key: 'membership', de: '/mitglied-werden', en: '/en/membership', ar: '/ar/membership' },
  { key: 'support', de: '/unterstuetzen', en: '/en/support', ar: '/ar/support' },
  { key: 'contact', de: '/kontakt', en: '/en/contact', ar: '/ar/contact' },
  { key: 'legal-notice', de: '/impressum', en: '/en/legal-notice', ar: '/ar/legal-notice' },
  { key: 'privacy', de: '/datenschutz', en: '/en/privacy', ar: '/ar/privacy' },
] as const

export const languageNav = { de: 'Sprache', en: 'Language', ar: 'اللغة' } as const
export const languageName = { de: 'Deutsch', en: 'English', ar: 'العربية' } as const
export const dirOf = (locale: Locale) => (locale === 'ar' ? 'rtl' : 'ltr')
