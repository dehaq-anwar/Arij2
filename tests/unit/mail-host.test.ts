import { describe, expect, it } from 'vitest'

import { checkMailHost, internalHostsAllowed, isInternalAddress } from '@/cms/mail/host-policy'

const resolvesTo =
  (...addresses: string[]) =>
  async () =>
    addresses.map((address) => ({ address }))

describe('mail servers entered in the Control Center', () => {
  it('tells internal addresses from internet addresses', () => {
    for (const address of [
      '127.0.0.1',
      '10.0.0.5',
      '172.20.0.3',
      '192.168.1.10',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '::1',
      '::',
      'fd00::1',
      'fe80::1',
      '::ffff:127.0.0.1',
    ]) {
      expect(isInternalAddress(address), address).toBe(true)
    }
    for (const address of ['9.9.9.9', '172.32.0.1', '193.99.144.80', '2a01:4f8::1']) {
      expect(isInternalAddress(address), address).toBe(false)
    }
  })

  it('uses a mail port and an internet address, and connects to the address checked', async () => {
    expect(
      await checkMailHost('smtp.example.org', 587, { resolve: resolvesTo('9.9.9.9') }),
    ).toEqual({ ok: true, address: '9.9.9.9' })
    expect(await checkMailHost('9.9.9.9', 465)).toEqual({ ok: true, address: '9.9.9.9' })
  })

  it('refuses other ports, internal addresses and names that resolve to one', async () => {
    const lookupNotNeeded = async () => {
      throw new Error('no lookup for a port that is refused anyway')
    }
    expect(await checkMailHost('smtp.example.org', 5432, { resolve: lookupNotNeeded })).toEqual({
      ok: false,
      code: 'PORT_NOT_ALLOWED',
    })
    expect(await checkMailHost('127.0.0.1', 25)).toEqual({ ok: false, code: 'HOST_NOT_ALLOWED' })
    // One internal address among several is enough to refuse (the connection could pick it).
    expect(
      await checkMailHost('mail.example.org', 587, { resolve: resolvesTo('9.9.9.9', '10.0.0.7') }),
    ).toEqual({ ok: false, code: 'HOST_NOT_ALLOWED' })
    expect(
      await checkMailHost('postgres', 587, {
        resolve: async () => {
          throw Object.assign(new Error('not found'), { code: 'ENOTFOUND' })
        },
      }),
    ).toEqual({ ok: false, code: 'HOST_NOT_FOUND' })
  })

  it('a relay inside the network only with the server setting', () => {
    expect(internalHostsAllowed({})).toBe(false)
    expect(internalHostsAllowed({ MAIL_ALLOW_INTERNAL_HOSTS: '1' })).toBe(false)
    expect(internalHostsAllowed({ MAIL_ALLOW_INTERNAL_HOSTS: 'true' })).toBe(true)
  })
})
