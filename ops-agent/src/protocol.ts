import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

/**
 * How the Control Center and the operations agent prove a request to each other
 * (docs/CONTROL-CENTER.md §3.1): an HMAC-SHA256 over the method, the path with its query, a
 * timestamp, a one-time value and the body's hash, with a secret both sides read from their
 * environment (OPS_AGENT_SECRET). The agent refuses requests older than a minute and every
 * one-time value it has seen before. Shared by both sides, so this file imports nothing else.
 */
export const SIGNATURE_HEADER = 'x-ops-signature'
export const TIMESTAMP_HEADER = 'x-ops-timestamp'
export const NONCE_HEADER = 'x-ops-nonce'
export const MAX_SKEW_MS = 60_000
export const MIN_SECRET_LENGTH = 32

export type SignedParts = {
  method: string
  path: string
  timestamp: string
  nonce: string
  body: string
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

export const canonical = ({ method, path, timestamp, nonce, body }: SignedParts) =>
  [method.toUpperCase(), path, timestamp, nonce, sha256(body)].join('\n')

export const signature = (secret: string, parts: SignedParts) =>
  createHmac('sha256', secret).update(canonical(parts)).digest('hex')

/** Constant-time comparison; false for anything that is not a well-formed signature. */
export function signatureMatches(secret: string, parts: SignedParts, given: string): boolean {
  if (!/^[0-9a-f]{64}$/.test(given)) return false
  return timingSafeEqual(Buffer.from(signature(secret, parts), 'hex'), Buffer.from(given, 'hex'))
}

/** Headers for a request from the Control Center to the agent. */
export function signedHeaders(
  secret: string,
  method: string,
  path: string,
  body = '',
  now = Date.now(),
  nonce = randomUUID(),
): Record<string, string> {
  const timestamp = String(now)
  return {
    [TIMESTAMP_HEADER]: timestamp,
    [NONCE_HEADER]: nonce,
    [SIGNATURE_HEADER]: signature(secret, { method, path, timestamp, nonce, body }),
  }
}
