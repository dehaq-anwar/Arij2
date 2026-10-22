import { describe, expect, it } from 'vitest'

import { checkDomain, type DnsLookups } from '@/cms/mail/dns'

/** A resolver answering from a table; names missing from it are "not found". */
function lookups(table: {
  mx?: Record<string, number>
  txt?: Record<string, string[]>
}): DnsLookups {
  const notFound = () => Object.assign(new Error('not found'), { code: 'ENOTFOUND' })
  return {
    mx: async (name) => {
      if (name !== 'example.org' || !table.mx) throw notFound()
      return Object.entries(table.mx).map(([exchange, priority]) => ({ exchange, priority }))
    },
    txt: async (name) => {
      const records = table.txt?.[name]
      if (!records) throw notFound()
      // Long TXT records arrive in chunks of up to 255 characters.
      return records.map((record) => [record.slice(0, 20), record.slice(20)])
    },
  }
}

const summary = async (table: Parameters<typeof lookups>[0], selector: string | null = 'mail') =>
  (await checkDomain('example.org', selector, lookups(table))).map(
    (r) => `${r.key}:${r.status}:${r.reason}`,
  )

describe('deliverability checks', () => {
  it('a well set up domain', async () => {
    const results = await checkDomain(
      'example.org',
      'mail',
      lookups({
        mx: { 'mx2.provider.example': 20, 'mx1.provider.example': 10 },
        txt: {
          'example.org': [
            'google-site-verification=abc',
            'v=spf1 include:_spf.provider.example -all',
          ],
          'mail._domainkey.example.org': [
            'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA',
          ],
          '_dmarc.example.org': ['v=DMARC1; p=quarantine; rua=mailto:dmarc@example.org'],
        },
      }),
    )
    expect(results.map((r) => `${r.key}:${r.status}`)).toEqual([
      'mx:ok',
      'spf:ok',
      'dkim:ok',
      'dmarc:ok',
    ])
    expect(results[0]?.value).toBe('10 mx1.provider.example, 20 mx2.provider.example')
    // Chunks are joined again.
    expect(results[1]?.value).toBe('v=spf1 include:_spf.provider.example -all')
  })

  it('names what is missing', async () => {
    expect(await summary({})).toEqual([
      'mx:missing:none',
      'spf:missing:none',
      'dkim:missing:none',
      'dmarc:missing:none',
    ])
    expect((await summary({}, null))[2]).toBe('dkim:unknown:noSelector')
  })

  it('warns about weak or broken records', async () => {
    expect(
      await summary({
        mx: { 'mx.example': 10 },
        txt: {
          'example.org': ['v=spf1 a mx +all'],
          '_dmarc.example.org': ['v=DMARC1; p=none; rua=mailto:x@example.org'],
          'mail._domainkey.example.org': ['v=DKIM1; p=abc'],
        },
      }),
    ).toEqual([
      'mx:ok:found',
      'spf:warning:allowsAll',
      'dkim:ok:found',
      'dmarc:warning:monitorOnly',
    ])
    expect(
      (
        await summary({
          txt: {
            'example.org': ['v=spf1 -all', 'v=spf1 include:x ~all'],
            '_dmarc.example.org': ['v=DMARC1'],
          },
        })
      ).filter((s) => /spf|dmarc/.test(s)),
    ).toEqual(['spf:warning:several', 'dmarc:warning:noPolicy'])
  })

  it('tells a failed lookup from a missing record', async () => {
    const broken: DnsLookups = {
      mx: async () => {
        throw Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })
      },
      txt: async () => {
        throw Object.assign(new Error('servfail'), { code: 'ESERVFAIL' })
      },
    }
    const results = await checkDomain('example.org', 'mail', broken)
    expect(results.map((r) => `${r.status}:${r.reason}`)).toEqual([
      'error:lookupFailed',
      'error:lookupFailed',
      'error:lookupFailed',
      'error:lookupFailed',
    ])
  })
})
