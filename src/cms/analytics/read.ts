import type { Payload, PayloadRequest } from 'payload'

export const RANGES = [7, 30, 90] as const
export type Range = (typeof RANGES)[number]
export const isRange = (value: unknown): value is Range => RANGES.includes(Number(value) as Range)

export type StoredHour = {
  hour: string
  views?: number | null
  entrances?: number | null
  bots?: number | null
  notFound?: number | null
  serverErrors?: number | null
  pages?: { path: string; locale: string; views: number; entrances: number }[] | null
  referrers?: { host: string; entrances: number }[] | null
  notFoundPaths?: { path: string; count: number }[] | null
  errors?: { path: string; status: number; count: number }[] | null
}

export type AnalyticsSummary = {
  range: Range
  hours: number
  days: { day: string; views: number; entrances: number }[]
  totals: { views: number; entrances: number; notFound: number; serverErrors: number; bots: number }
  pages: { path: string; locale: string; views: number }[]
  locales: { locale: string; views: number }[]
  referrers: { host: string; entrances: number }[]
  direct: number
  notFound: { path: string; count: number }[]
  errors: { path: string; status: number; count: number }[]
}

const DAY = 24 * 3_600_000

/** YYYY-MM-DD in the association's time zone. */
export const berlinDay = (date: Date) =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)

const top = <T>(map: Map<string, T>, value: (item: T) => number, limit: number) =>
  [...map.values()].sort((a, b) => value(b) - value(a)).slice(0, limit)

/** The stored hours of a range, added up: per day, per page, language, referrer, 404, error. */
export function summarise(entries: StoredHour[], range: Range, now: Date): AnalyticsSummary {
  const days = new Map<string, { day: string; views: number; entrances: number }>()
  // Every day of the range, also those without visits (so the chart shows the gaps).
  for (let i = range - 1; i >= 0; i--) {
    const day = berlinDay(new Date(now.getTime() - i * DAY))
    days.set(day, { day, views: 0, entrances: 0 })
  }
  const totals = { views: 0, entrances: 0, notFound: 0, serverErrors: 0, bots: 0 }
  const pages = new Map<string, { path: string; locale: string; views: number }>()
  const locales = new Map<string, { locale: string; views: number }>()
  const referrers = new Map<string, { host: string; entrances: number }>()
  const notFound = new Map<string, { path: string; count: number }>()
  const errors = new Map<string, { path: string; status: number; count: number }>()
  for (const entry of entries) {
    const day = days.get(berlinDay(new Date(entry.hour)))
    const views = entry.views ?? 0
    const entrances = entry.entrances ?? 0
    if (day) {
      day.views += views
      day.entrances += entrances
    }
    totals.views += views
    totals.entrances += entrances
    totals.notFound += entry.notFound ?? 0
    totals.serverErrors += entry.serverErrors ?? 0
    totals.bots += entry.bots ?? 0
    for (const page of entry.pages ?? []) {
      const key = `${page.locale} ${page.path}`
      const item = pages.get(key) ?? { path: page.path, locale: page.locale, views: 0 }
      item.views += page.views
      pages.set(key, item)
      const locale = locales.get(page.locale) ?? { locale: page.locale, views: 0 }
      locale.views += page.views
      locales.set(page.locale, locale)
    }
    for (const referrer of entry.referrers ?? []) {
      const item = referrers.get(referrer.host) ?? { host: referrer.host, entrances: 0 }
      item.entrances += referrer.entrances
      referrers.set(referrer.host, item)
    }
    for (const miss of entry.notFoundPaths ?? []) {
      const item = notFound.get(miss.path) ?? { path: miss.path, count: 0 }
      item.count += miss.count
      notFound.set(miss.path, item)
    }
    for (const error of entry.errors ?? []) {
      const key = `${error.status} ${error.path}`
      const item = errors.get(key) ?? { path: error.path, status: error.status, count: 0 }
      item.count += error.count
      errors.set(key, item)
    }
  }
  const fromReferrers = [...referrers.values()].reduce((sum, r) => sum + r.entrances, 0)
  return {
    range,
    hours: entries.length,
    days: [...days.values()],
    totals,
    pages: top(pages, (p) => p.views, 10),
    locales: ['de', 'en', 'ar'].map((locale) => locales.get(locale) ?? { locale, views: 0 }),
    referrers: top(referrers, (r) => r.entrances, 8),
    direct: Math.max(0, totals.entrances - fromReferrers),
    notFound: top(notFound, (n) => n.count, 10),
    errors: top(errors, (e) => e.count, 10),
  }
}

export async function analyticsSummary(
  payload: Payload,
  range: Range,
  now = new Date(),
  req?: PayloadRequest,
) {
  const { docs } = await payload.find({
    collection: 'access-stats',
    where: { hour: { greater_than_equal: new Date(now.getTime() - range * DAY).toISOString() } },
    sort: 'hour',
    pagination: false,
    depth: 0,
    overrideAccess: true,
    ...(req ? { req } : {}),
  })
  return summarise(docs as unknown as StoredHour[], range, now)
}
