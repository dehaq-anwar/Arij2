import { Resolver } from 'node:dns/promises'

/**
 * Deliverability of the sender's domain (docs/CONTROL-CENTER.md §6): real DNS lookups from the
 * server for MX, SPF, DKIM (with the selector the mail provider names) and DMARC, each with a
 * result the interface explains in plain words. Read-only: DNS records are changed at the DNS
 * provider (decision 4).
 */
export type DnsKey = 'mx' | 'spf' | 'dkim' | 'dmarc'
export type DnsStatus = 'ok' | 'warning' | 'missing' | 'unknown' | 'error'
export type DnsResult = {
  key: DnsKey
  status: DnsStatus
  /** The record(s) found, shortened for display. */
  value: string | null
  /** Why the status is what it is (a key the interface turns into advice). */
  reason:
    | 'found'
    | 'none'
    | 'several'
    | 'allowsAll'
    | 'noPolicy'
    | 'monitorOnly'
    | 'noSelector'
    | 'lookupFailed'
}

export type DnsLookups = {
  mx: (name: string) => Promise<{ exchange: string; priority: number }[]>
  txt: (name: string) => Promise<string[][]>
}

const NOT_FOUND = new Set(['ENOTFOUND', 'ENODATA', 'ENONAME'])

function resolver(): DnsLookups {
  const r = new Resolver({ timeout: 3_000, tries: 2 })
  return { mx: (name) => r.resolveMx(name), txt: (name) => r.resolveTxt(name) }
}

/** A failed lookup: "no such record" or "could not ask". */
const failure = (key: DnsKey, error: unknown): DnsResult =>
  NOT_FOUND.has(String((error as { code?: string }).code))
    ? { key, status: 'missing', value: null, reason: 'none' }
    : { key, status: 'error', value: null, reason: 'lookupFailed' }

const short = (value: string) => (value.length > 160 ? `${value.slice(0, 157)}…` : value)

async function txtRecords(lookups: DnsLookups, name: string) {
  return (await lookups.txt(name)).map((chunks) => chunks.join(''))
}

export async function checkMx(domain: string, lookups: DnsLookups): Promise<DnsResult> {
  try {
    const records = (await lookups.mx(domain)).sort((a, b) => a.priority - b.priority)
    if (!records.length) return { key: 'mx', status: 'missing', value: null, reason: 'none' }
    return {
      key: 'mx',
      status: 'ok',
      value: short(records.map((r) => `${r.priority} ${r.exchange}`).join(', ')),
      reason: 'found',
    }
  } catch (error) {
    return failure('mx', error)
  }
}

export async function checkSpf(domain: string, lookups: DnsLookups): Promise<DnsResult> {
  try {
    const spf = (await txtRecords(lookups, domain)).filter((t) => /^v=spf1(\s|$)/i.test(t))
    if (!spf.length) return { key: 'spf', status: 'missing', value: null, reason: 'none' }
    // More than one SPF record makes all of them invalid (RFC 7208 §3.2).
    if (spf.length > 1) {
      return { key: 'spf', status: 'warning', value: short(spf.join(' | ')), reason: 'several' }
    }
    const record = spf[0]!
    if (/(^|\s)\+?all(\s|$)/i.test(record)) {
      return { key: 'spf', status: 'warning', value: short(record), reason: 'allowsAll' }
    }
    return { key: 'spf', status: 'ok', value: short(record), reason: 'found' }
  } catch (error) {
    return failure('spf', error)
  }
}

export async function checkDmarc(domain: string, lookups: DnsLookups): Promise<DnsResult> {
  try {
    const records = (await txtRecords(lookups, `_dmarc.${domain}`)).filter((t) =>
      /^v=DMARC1(\s*;|$)/i.test(t),
    )
    if (!records.length) return { key: 'dmarc', status: 'missing', value: null, reason: 'none' }
    const record = records[0]!
    const policy = /(?:^|;)\s*p\s*=\s*(\w+)/i.exec(record)?.[1]?.toLowerCase()
    if (!policy)
      return { key: 'dmarc', status: 'warning', value: short(record), reason: 'noPolicy' }
    if (policy === 'none') {
      return { key: 'dmarc', status: 'warning', value: short(record), reason: 'monitorOnly' }
    }
    return { key: 'dmarc', status: 'ok', value: short(record), reason: 'found' }
  } catch (error) {
    return failure('dmarc', error)
  }
}

export async function checkDkim(
  domain: string,
  selector: string | null,
  lookups: DnsLookups,
): Promise<DnsResult> {
  if (!selector) return { key: 'dkim', status: 'unknown', value: null, reason: 'noSelector' }
  try {
    const records = (await txtRecords(lookups, `${selector}._domainkey.${domain}`)).filter((t) =>
      /(^|;)\s*p=/i.test(t),
    )
    if (!records.length) return { key: 'dkim', status: 'missing', value: null, reason: 'none' }
    return { key: 'dkim', status: 'ok', value: short(records[0]!), reason: 'found' }
  } catch (error) {
    return failure('dkim', error)
  }
}

export async function checkDomain(
  domain: string,
  selector: string | null,
  lookups: DnsLookups = resolver(),
): Promise<DnsResult[]> {
  return Promise.all([
    checkMx(domain, lookups),
    checkSpf(domain, lookups),
    checkDkim(domain, selector, lookups),
    checkDmarc(domain, lookups),
  ])
}
