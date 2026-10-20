import { randomBytes } from 'node:crypto'

import { HOTP, Secret, TOTP } from 'otpauth'

import { safeEqual } from './crypto'

/**
 * Time-based one-time passwords (RFC 6238) as understood by Google Authenticator, Microsoft
 * Authenticator and similar apps: HMAC-SHA1, 6 digits, 30-second steps. Of `otpauth` only the
 * code calculation and the setup URI are used; checking a code happens here:
 * - only exactly six ASCII digits are accepted (otpauth's own check throws on other input),
 * - the previous, current and next step are all compared in constant time (clock drift),
 * - a step that was already used, or an earlier one, is refused (no replay).
 */
export const TOTP_PERIOD_SECONDS = 30
export const TOTP_DIGITS = 6
const ISSUER = 'Youth of Peace'

/** 160 random bits, the length RFC 4226 recommends for SHA-1. */
export const newTotpSecret = () => randomBytes(20)

export const totpStep = (now = Date.now()) => Math.floor(now / 1000 / TOTP_PERIOD_SECONDS)

/**
 * otpauth wants an ArrayBuffer. A Node Buffer's `.buffer` can be a shared 8 KB pool, so the
 * bytes are always copied into an ArrayBuffer of exactly their length.
 */
const toSecret = (secret: Buffer) => new Secret({ buffer: new Uint8Array(secret).buffer })

export function totpCode(secret: Buffer, step: number): string {
  return HOTP.generate({
    secret: toSecret(secret),
    algorithm: 'SHA1',
    digits: TOTP_DIGITS,
    counter: step,
  })
}

/**
 * The step the code belongs to, or null if it is wrong or was already used. `lastStep` is the
 * step of the last code this account used successfully (-1 if none yet).
 */
export function verifyTotp(
  secret: Buffer,
  input: string,
  lastStep: number,
  now = Date.now(),
): number | null {
  const code = input.trim()
  if (!/^[0-9]{6}$/.test(code)) return null
  const current = totpStep(now)
  let matched: number | null = null
  for (const step of [current - 1, current, current + 1]) {
    // No early exit: every candidate costs the same.
    const equal = safeEqual(totpCode(secret, step), code)
    if (equal && matched === null) matched = step
  }
  if (matched === null || matched <= lastStep) return null
  return matched
}

/** The otpauth:// address that the authenticator app reads from the QR code. */
export function totpUri(secret: Buffer, accountName: string): string {
  return new TOTP({
    issuer: ISSUER,
    label: accountName,
    algorithm: 'SHA1',
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD_SECONDS,
    secret: toSecret(secret),
  }).toString()
}

/** For typing the secret by hand, in groups of four. */
export const formatSecret = (secret: Buffer) =>
  toSecret(secret)
    .base32.replace(/(.{4})/g, '$1 ')
    .trim()
