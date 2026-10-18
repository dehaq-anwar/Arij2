import type { Locale } from './routing'

export type Direction = 'ltr' | 'rtl'

export const getDirection = (locale: Locale): Direction => (locale === 'ar' ? 'rtl' : 'ltr')

/**
 * BCP 47 tag used for Intl number/date formatting.
 * Arabic uses Western digits (0–9); drop "-u-nu-latn" to switch to Arabic-Indic digits (٠–٩).
 */
export const getIntlLocale = (locale: Locale): string => (locale === 'ar' ? 'ar-u-nu-latn' : locale)

/** Each language's name, written in that language (used by the language switcher). */
export const localeNames: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
  ar: 'العربية',
}
