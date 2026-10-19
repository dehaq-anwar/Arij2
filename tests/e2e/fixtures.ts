import { test } from '@playwright/test'

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

/** Test data from scripts/e2e-fixtures.ts (exists only in the "_e2e" database). */
export const testData = {
  translatedProject: {
    de: '/projekte/e2e-testprojekt',
    en: '/en/projects/e2e-testprojekt',
    ar: '/ar/projects/e2e-testprojekt',
  },
  germanOnlyProject: {
    de: '/projekte/e2e-nur-deutsch',
    en: '/en/projects/e2e-nur-deutsch',
    ar: '/ar/projects/e2e-nur-deutsch',
  },
  unpublishedProject: '/projekte/e2e-unveroeffentlicht',
  post: {
    de: '/aktuelles/e2e-testbeitrag',
    en: '/en/news/e2e-testbeitrag',
    ar: '/ar/news/e2e-testbeitrag',
  },
} as const

/** Detail pages checked by axe in addition to `routes`. */
export const detailPages = [
  testData.translatedProject.de,
  testData.translatedProject.ar,
  testData.germanOnlyProject.ar,
  testData.post.de,
  testData.post.en,
] as const

/**
 * A fresh client address (IPv6 documentation range) for the rate limiter. The test server has no
 * reverse proxy, so an X-Forwarded-For header reaches the app unchanged; in production the proxy
 * sets it.
 */
export const freshAddress = () =>
  `2001:db8::${Math.floor(Math.random() * 0xffff).toString(16)}:${(Date.now() % 0xffff).toString(16)}`

/**
 * The CMS account of this test worker for a role (see scripts/e2e-fixtures.ts): every worker
 * signs in to its own accounts, so parallel sign-ins never overwrite each other's session.
 */
export const account = (role: 'admin' | 'editor' | 'board') => ({
  email: `e2e-${role}-${test.info().parallelIndex}@example.test`,
  password: process.env.E2E_EDITOR_PASSWORD ?? '',
})
