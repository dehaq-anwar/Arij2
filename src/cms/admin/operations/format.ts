import type { AdminLanguage } from '../i18n'

const locale = (language: AdminLanguage) =>
  language === 'ar' ? 'ar-u-nu-latn' : language === 'en' ? 'en-GB' : 'de-DE'

/** 1536 → "1.5 KB"; binary steps, one decimal below 10. */
export function formatBytes(value: number | null | undefined, language: AdminLanguage) {
  if (value == null || !Number.isFinite(value)) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = value
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit++
  }
  const digits = size < 10 && unit > 0 ? 1 : 0
  const text = `${new Intl.NumberFormat(locale(language), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(size)} ${units[unit]}`
  // Kept left to right inside Arabic text (Latin unit after the number): "312 MB".
  return language === 'ar' ? `\u2066${text}\u2069` : text
}

export function formatPercent(value: number | null | undefined, language: AdminLanguage) {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${new Intl.NumberFormat(locale(language), { maximumFractionDigits: value < 10 ? 1 : 0 }).format(value)} %`
}

export const formatNumber = (value: number | null | undefined, language: AdminLanguage) =>
  value == null || !Number.isFinite(value)
    ? '—'
    : new Intl.NumberFormat(locale(language)).format(value)

/** Seconds as "2 min 41 s" / "41 s". */
export function formatDuration(seconds: number | null | undefined, language: AdminLanguage) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—'
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  const unit = { de: ['Min.', 's'], en: ['min', 's'], ar: ['د', 'ث'] }[language]
  return minutes ? `${minutes} ${unit[0]} ${rest} ${unit[1]}` : `${rest} ${unit[1]}`
}

export const percentOf = (used: number | null | undefined, total: number | null | undefined) =>
  used != null && total ? (used / total) * 100 : null
