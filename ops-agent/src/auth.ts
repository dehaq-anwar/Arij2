import {
  MAX_SKEW_MS,
  NONCE_HEADER,
  SIGNATURE_HEADER,
  signatureMatches,
  TIMESTAMP_HEADER,
} from './protocol.ts'

/** One-time values seen within the allowed clock skew; older ones can no longer be replayed. */
export class NonceCache {
  private seen = new Map<string, number>()

  /** False when the value was used before (a replay). */
  use(nonce: string, now = Date.now()): boolean {
    for (const [value, at] of this.seen) {
      if (now - at > 2 * MAX_SKEW_MS) this.seen.delete(value)
    }
    if (this.seen.has(nonce)) return false
    this.seen.set(nonce, now)
    return true
  }
}

export type AuthResult = { ok: true } | { ok: false; reason: string }

type Headers = Record<string, string | string[] | undefined>
const header = (headers: Headers, name: string) => {
  const value = headers[name]
  return Array.isArray(value) ? value[0] : value
}

/** Checks one request: well-formed headers, fresh timestamp, unused one-time value, signature. */
export function authenticate(
  secret: string,
  nonces: NonceCache,
  request: { method: string; path: string; headers: Headers; body: string },
  now = Date.now(),
): AuthResult {
  const timestamp = header(request.headers, TIMESTAMP_HEADER)
  const nonce = header(request.headers, NONCE_HEADER)
  const given = header(request.headers, SIGNATURE_HEADER)
  if (!timestamp || !nonce || !given) return { ok: false, reason: 'unsigned' }
  if (!/^\d{13}$/.test(timestamp) || !/^[0-9a-f-]{36}$/.test(nonce)) {
    return { ok: false, reason: 'malformed' }
  }
  if (Math.abs(now - Number(timestamp)) > MAX_SKEW_MS) return { ok: false, reason: 'expired' }
  const parts = { method: request.method, path: request.path, timestamp, nonce, body: request.body }
  if (!signatureMatches(secret, parts, given)) return { ok: false, reason: 'signature' }
  // Only a correctly signed request may use up a one-time value.
  if (!nonces.use(nonce, now)) return { ok: false, reason: 'replay' }
  return { ok: true }
}

/** At most `limit` actions per key within `windowMs` (e.g. three restarts of one service). */
export class RateLimiter {
  private hits = new Map<string, number[]>()

  private readonly limit: number
  private readonly windowMs: number

  constructor(limit: number, windowMs: number) {
    this.limit = limit
    this.windowMs = windowMs
  }

  allow(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((at) => now - at < this.windowMs)
    if (recent.length >= this.limit) {
      this.hits.set(key, recent)
      return false
    }
    recent.push(now)
    this.hits.set(key, recent)
    return true
  }
}
