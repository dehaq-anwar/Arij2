import { describe, expect, it } from 'vitest'

import { berlinDay, isRange, summarise, type StoredHour } from '@/cms/analytics/read'

const hour = (iso: string, extra: Partial<StoredHour> = {}): StoredHour => ({
  hour: iso,
  views: 10,
  entrances: 4,
  bots: 3,
  notFound: 0,
  serverErrors: 0,
  pages: [
    { path: '/', locale: 'de', views: 6, entrances: 3 },
    { path: '/en', locale: 'en', views: 4, entrances: 1 },
  ],
  referrers: [{ host: 'duckduckgo.com', entrances: 1 }],
  notFoundPaths: [],
  errors: [],
  ...extra,
})

describe('visitor statistics', () => {
  const now = new Date('2026-10-22T10:30:00.000Z')

  it('adds up hours per day in Berlin time, with empty days kept', () => {
    const summary = summarise(
      [
        // 23:30 UTC on the 20th is already the 21st in Berlin (summer time, UTC+2).
        hour('2026-10-20T22:00:00.000Z'),
        hour('2026-10-21T08:00:00.000Z'),
        hour('2026-10-22T07:00:00.000Z', { views: 1, entrances: 1, pages: [] }),
      ],
      7,
      now,
    )
    expect(summary.days).toHaveLength(7)
    expect(summary.days.at(-1)).toEqual({ day: '2026-10-22', views: 1, entrances: 1 })
    expect(summary.days.at(-2)).toEqual({ day: '2026-10-21', views: 20, entrances: 8 })
    expect(summary.days.at(-3)).toEqual({ day: '2026-10-20', views: 0, entrances: 0 })
    expect(summary.totals).toEqual({
      views: 21,
      entrances: 9,
      notFound: 0,
      serverErrors: 0,
      bots: 9,
    })
  })

  it('ranks pages, languages, sources, missing addresses and errors', () => {
    const summary = summarise(
      [
        hour('2026-10-21T08:00:00.000Z', {
          notFound: 3,
          serverErrors: 1,
          notFoundPaths: [
            { path: '/alt', count: 2 },
            { path: '/kaputt', count: 1 },
          ],
          errors: [{ path: '/en/news/x', status: 500, count: 1 }],
        }),
        hour('2026-10-21T09:00:00.000Z', {
          referrers: [
            { host: 'duckduckgo.com', entrances: 1 },
            { host: 'instagram.com', entrances: 2 },
          ],
          notFoundPaths: [{ path: '/alt', count: 1 }],
        }),
      ],
      30,
      now,
    )
    expect(summary.pages).toEqual([
      { path: '/', locale: 'de', views: 12 },
      { path: '/en', locale: 'en', views: 8 },
    ])
    expect(summary.locales).toEqual([
      { locale: 'de', views: 12 },
      { locale: 'en', views: 8 },
      { locale: 'ar', views: 0 },
    ])
    expect(summary.referrers).toEqual([
      { host: 'duckduckgo.com', entrances: 2 },
      { host: 'instagram.com', entrances: 2 },
    ])
    // Visits without a referring site: direct or unknown.
    expect(summary.direct).toBe(8 - 4)
    expect(summary.notFound).toEqual([
      { path: '/alt', count: 3 },
      { path: '/kaputt', count: 1 },
    ])
    expect(summary.errors).toEqual([{ path: '/en/news/x', status: 500, count: 1 }])
  })

  it('accepts only the offered periods', () => {
    expect([7, '30', 90].every(isRange)).toBe(true)
    expect([0, 1, '365', 'x', null].some(isRange)).toBe(false)
    expect(berlinDay(new Date('2026-12-31T23:30:00.000Z'))).toBe('2027-01-01')
  })
})
