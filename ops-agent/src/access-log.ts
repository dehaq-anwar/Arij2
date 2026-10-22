import { createReadStream } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createInterface } from 'node:readline'

import { maskLine } from './mask.ts'

/**
 * Visitor statistics without cookies (docs/CONTROL-CENTER.md §7): the website's access log
 * (Caddy, JSON, kept 7 days, IP addresses already shortened by Caddy) is counted per hour.
 * What leaves the agent are counts only — pages, languages, referring sites (host only), 404
 * and 5xx paths. No IP address, user agent or full referrer is passed on or stored.
 */
export type HourStats = {
  hour: string
  requests: number
  views: number
  entrances: number
  bots: number
  notFound: number
  serverErrors: number
  pages: { path: string; locale: string; views: number; entrances: number }[]
  referrers: { host: string; entrances: number }[]
  notFoundPaths: { path: string; count: number }[]
  errors: { path: string; status: number; count: number }[]
}

type Entry = {
  ts?: number
  status?: number
  request?: {
    method?: string
    host?: string
    uri?: string
    headers?: Record<string, string[] | undefined>
  }
}

const BOT =
  /bot|crawl|spider|slurp|archiver|facebookexternalhit|embedly|preview|monitor|uptime|pingdom|curl|wget|python|java\/|go-http|okhttp|axios|node-fetch|headless|lighthouse|phantom|scrapy|httpclient/i
const ASSET =
  /\.(?:js|mjs|css|map|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|txt|xml|json|ics|pdf|webmanifest)$/i
const NOT_PAGE = /^\/(?:_next|api|admin|calendar|preview)(?:\/|$)/
const MAX_PATHS = 500

const head = (request: Entry['request'], name: string) => {
  const all = request?.headers
  if (!all) return ''
  const key = Object.keys(all).find((k) => k.toLowerCase() === name.toLowerCase())
  return key ? (all[key]?.[0] ?? '') : ''
}

export function normalisePath(uri: string): string {
  let path = uri.split(/[?#]/)[0] ?? '/'
  try {
    path = decodeURI(path)
  } catch {
    // Keep it as sent.
  }
  if (path.length > 1) path = path.replace(/\/+$/, '')
  return path.slice(0, 200) || '/'
}

export const localeOf = (path: string) => {
  const first = path.split('/')[1]
  return first === 'en' || first === 'ar' ? first : 'de'
}

export function referrerHost(referer: string, ownHosts: readonly string[]): string | null {
  if (!referer) return null
  try {
    const host = new URL(referer).hostname.toLowerCase().replace(/^www\./, '')
    if (!host || ownHosts.some((own) => own.replace(/^www\./, '') === host)) return null
    return host.slice(0, 120)
  } catch {
    return null
  }
}

export const hourOf = (seconds: number) => {
  const date = new Date(seconds * 1000)
  date.setUTCMinutes(0, 0, 0)
  return date.toISOString()
}

type Bucket = {
  requests: number
  views: number
  entrances: number
  bots: number
  notFound: number
  serverErrors: number
  pages: Map<string, { path: string; locale: string; views: number; entrances: number }>
  referrers: Map<string, number>
  notFoundPaths: Map<string, number>
  errors: Map<string, { path: string; status: number; count: number }>
}

const bucket = (): Bucket => ({
  requests: 0,
  views: 0,
  entrances: 0,
  bots: 0,
  notFound: 0,
  serverErrors: 0,
  pages: new Map(),
  referrers: new Map(),
  notFoundPaths: new Map(),
  errors: new Map(),
})

export class Aggregator {
  private buckets = new Map<string, Bucket>()

  private readonly ownHosts: readonly string[]

  constructor(ownHosts: readonly string[]) {
    this.ownHosts = ownHosts
  }

  add(entry: Entry) {
    if (typeof entry.ts !== 'number' || !entry.request?.uri) return
    const hour = hourOf(entry.ts)
    let b = this.buckets.get(hour)
    if (!b) {
      b = bucket()
      this.buckets.set(hour, b)
    }
    b.requests++
    const status = Number(entry.status) || 0
    const method = (entry.request.method ?? 'GET').toUpperCase()
    const path = normalisePath(entry.request.uri)
    if (status >= 500) {
      b.serverErrors++
      // Error and 404 addresses can be anything a visitor typed: masked like log lines.
      const masked = maskLine(path)
      const key = `${status} ${masked}`
      const error = b.errors.get(key) ?? { path: masked, status, count: 0 }
      error.count++
      if (b.errors.has(key) || b.errors.size < MAX_PATHS) b.errors.set(key, error)
      return
    }
    if (method !== 'GET' && method !== 'HEAD') return
    if (status === 404) {
      if (path.startsWith('/_next/')) return
      b.notFound++
      const masked = maskLine(path)
      if (b.notFoundPaths.has(masked) || b.notFoundPaths.size < MAX_PATHS) {
        b.notFoundPaths.set(masked, (b.notFoundPaths.get(masked) ?? 0) + 1)
      }
      return
    }
    if (status !== 200 && status !== 304) return
    if (NOT_PAGE.test(path) || ASSET.test(path)) return
    // Next.js prefetches pages before anyone opens them: not a view.
    const prefetch =
      head(entry.request, 'Next-Router-Prefetch') === '1' ||
      /prefetch/i.test(head(entry.request, 'Sec-Purpose') || head(entry.request, 'Purpose'))
    if (prefetch) return
    if (BOT.test(head(entry.request, 'User-Agent')) || !head(entry.request, 'User-Agent')) {
      b.bots++
      return
    }
    b.views++
    // A full page load (not a navigation inside the site) from outside or without a referrer
    // starts a visit.
    const navigation = head(entry.request, 'RSC') === '1'
    const from = referrerHost(head(entry.request, 'Referer'), this.ownHosts)
    const ownReferrer = head(entry.request, 'Referer') !== '' && from === null
    const entrance = !navigation && !ownReferrer
    if (entrance) {
      b.entrances++
      if (from) b.referrers.set(from, (b.referrers.get(from) ?? 0) + 1)
    }
    const key = path
    const page = b.pages.get(key) ?? { path, locale: localeOf(path), views: 0, entrances: 0 }
    page.views++
    if (entrance) page.entrances++
    if (b.pages.has(key) || b.pages.size < MAX_PATHS) b.pages.set(key, page)
  }

  result(): HourStats[] {
    return [...this.buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, b]) => ({
        hour,
        requests: b.requests,
        views: b.views,
        entrances: b.entrances,
        bots: b.bots,
        notFound: b.notFound,
        serverErrors: b.serverErrors,
        pages: [...b.pages.values()].sort((x, y) => y.views - x.views),
        referrers: [...b.referrers.entries()]
          .map(([host, entrances]) => ({ host, entrances }))
          .sort((x, y) => y.entrances - x.entrances),
        notFoundPaths: [...b.notFoundPaths.entries()]
          .map(([path, count]) => ({ path, count }))
          .sort((x, y) => y.count - x.count),
        errors: [...b.errors.values()].sort((x, y) => y.count - x.count),
      }))
  }
}

/**
 * Counts the complete hours in [since, until) from the current log file and its rolled
 * predecessors. Lines that are not JSON (or not access entries) are skipped.
 */
export async function aggregateAccessLogs(
  dir: string,
  prefix: string,
  since: Date,
  until: Date,
  ownHosts: readonly string[],
): Promise<HourStats[]> {
  let files: string[] = []
  try {
    files = (await readdir(dir)).filter(
      (name) => name.startsWith(prefix) && /\.log$/.test(name) && !name.includes('/'),
    )
  } catch {
    return []
  }
  const from = since.getTime() / 1000
  const to = until.getTime() / 1000
  const aggregator = new Aggregator(ownHosts)
  for (const file of files) {
    const lines = createInterface({
      input: createReadStream(join(dir, file), 'utf8'),
      crlfDelay: Infinity,
    })
    for await (const line of lines) {
      if (!line.startsWith('{')) continue
      let entry: Entry
      try {
        entry = JSON.parse(line) as Entry
      } catch {
        continue
      }
      if (typeof entry.ts !== 'number' || entry.ts < from || entry.ts >= to) continue
      aggregator.add(entry)
    }
  }
  return aggregator.result()
}
