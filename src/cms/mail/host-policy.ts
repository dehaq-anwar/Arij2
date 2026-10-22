import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'

/** The ports mail is submitted or relayed on. */
export const SMTP_PORTS = [25, 465, 587, 2525] as const

/**
 * Addresses that are not on the internet: this machine, the private networks the server's own
 * services live in (Docker, the hosting provider's network), link-local, shared and reserved
 * ranges.
 */
const internal = new BlockList()
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 3],
] as const) {
  internal.addSubnet(network, prefix, 'ipv4')
}
for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  internal.addSubnet(network, prefix, 'ipv6')
}

export function isInternalAddress(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)
  if (mapped) return internal.check(mapped[1]!, 'ipv4')
  const family = isIP(address)
  if (family === 4) return internal.check(address, 'ipv4')
  if (family === 6) return internal.check(address, 'ipv6')
  return false
}

/** MAIL_ALLOW_INTERNAL_HOSTS=true: a relay inside the server's network may be set on the screen. */
export const internalHostsAllowed = (env: Record<string, string | undefined> = process.env) =>
  env.MAIL_ALLOW_INTERNAL_HOSTS === 'true'

export type HostCheck =
  | { ok: true; address: string }
  | { ok: false; code: 'PORT_NOT_ALLOWED' | 'HOST_NOT_ALLOWED' | 'HOST_NOT_FOUND' }

type Lookup = (host: string) => Promise<{ address: string }[]>
const resolveAll: Lookup = (host) => lookup(host, { all: true, verbatim: true })

/**
 * A mail server entered in the Control Center (not one set on the server in .env) is used only on
 * a mail port and only if every address its name resolves to is on the internet. Otherwise "test
 * e-mail" could be used to reach the server's own services (the database, the operations agent)
 * or scan its network. The connection then goes to the address checked here, so a name that
 * resolves differently a moment later cannot slip past.
 */
export async function checkMailHost(
  host: string,
  port: number,
  { resolve = resolveAll }: { resolve?: Lookup } = {},
): Promise<HostCheck> {
  if (!(SMTP_PORTS as readonly number[]).includes(port)) {
    return { ok: false, code: 'PORT_NOT_ALLOWED' }
  }
  let addresses: { address: string }[]
  try {
    addresses = isIP(host) ? [{ address: host }] : await resolve(host)
  } catch {
    return { ok: false, code: 'HOST_NOT_FOUND' }
  }
  if (!addresses.length) return { ok: false, code: 'HOST_NOT_FOUND' }
  if (addresses.some(({ address }) => isInternalAddress(address))) {
    return { ok: false, code: 'HOST_NOT_ALLOWED' }
  }
  return { ok: true, address: addresses[0]!.address }
}
