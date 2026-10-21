import { connect, type PeerCertificate } from 'node:tls'

/**
 * The certificate Caddy actually serves for each host (docs/CONTROL-CENTER.md §3.6): connected
 * through Caddy's internal address with the host as SNI, so it is checked even before DNS points
 * to the server.
 */
export type CertificateStatus = {
  host: string
  ok: boolean
  validTo: string | null
  daysLeft: number | null
  issuer: string | null
  trusted: boolean
  error: string | null
}

const DAY = 24 * 60 * 60 * 1000

export function checkCertificate(
  host: string,
  connectTo: string,
  timeoutMs = 8000,
  now = Date.now(),
): Promise<CertificateStatus> {
  const [address, portText] = connectTo.split(':')
  const port = Number(portText) || 443
  return new Promise((resolve) => {
    const done = (status: Omit<CertificateStatus, 'host'>) => {
      socket.destroy()
      resolve({ host, ...status })
    }
    const socket = connect({
      host: address,
      port,
      servername: host,
      // Read the certificate even when it is not trusted, to report why.
      rejectUnauthorized: false,
      timeout: timeoutMs,
    })
    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate() as PeerCertificate | undefined
      if (!cert || !cert.valid_to) {
        done({
          ok: false,
          validTo: null,
          daysLeft: null,
          issuer: null,
          trusted: false,
          error: 'no certificate',
        })
        return
      }
      const validTo = new Date(cert.valid_to)
      const daysLeft = Math.floor((validTo.getTime() - now) / DAY)
      const issuer = cert.issuer?.O || cert.issuer?.CN || null
      const trusted = socket.authorized
      done({
        ok: trusted && daysLeft >= 14,
        validTo: validTo.toISOString(),
        daysLeft,
        issuer: typeof issuer === 'string' ? issuer : null,
        trusted,
        error: trusted ? null : String(socket.authorizationError ?? 'not trusted'),
      })
    })
    socket.once('timeout', () =>
      done({
        ok: false,
        validTo: null,
        daysLeft: null,
        issuer: null,
        trusted: false,
        error: 'timeout',
      }),
    )
    socket.once('error', (error: NodeJS.ErrnoException) =>
      done({
        ok: false,
        validTo: null,
        daysLeft: null,
        issuer: null,
        trusted: false,
        error: error.code ?? 'connection failed',
      }),
    )
  })
}
