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

/** Date and time of an event, in Berlin time: "Samstag, 14. März 2026, 18:00". */
export const formatDateTime = (locale: Locale, value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat(getIntlLocale(locale), {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Berlin',
      }).format(new Date(value))
    : ''

/** "18:00" in Berlin time (the end of an event on the same day). */
export const formatTime = (locale: Locale, value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat(getIntlLocale(locale), {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Berlin',
      }).format(new Date(value))
    : ''

const berlinDay = (value: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date(value))

/** Start and end of an event; the end without its date when it is on the same day. */
export function formatEventTime(locale: Locale, startsAt: string, endsAt?: string | null) {
  const start = formatDateTime(locale, startsAt)
  if (!endsAt) return start
  const end =
    berlinDay(endsAt) === berlinDay(startsAt)
      ? formatTime(locale, endsAt)
      : formatDateTime(locale, endsAt)
  return `${start} – ${end}`
}
