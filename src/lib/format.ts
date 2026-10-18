import { getIntlLocale } from '@/i18n/locale'
import type { Locale } from '@/i18n/routing'

export const formatDate = (
  locale: Locale,
  value: string | null | undefined,
  month: 'long' | 'short' = 'long',
) =>
  value
    ? new Intl.DateTimeFormat(getIntlLocale(locale), {
        year: 'numeric',
        month,
        day: 'numeric',
        timeZone: 'Europe/Berlin',
      }).format(new Date(value))
    : ''

export const formatMonthYear = (locale: Locale, value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat(getIntlLocale(locale), {
        year: 'numeric',
        month: 'long',
        timeZone: 'Europe/Berlin',
      }).format(new Date(value))
    : ''

export const formatNumber = (locale: Locale, value: number) =>
  new Intl.NumberFormat(getIntlLocale(locale)).format(value)
