import { createHmac, timingSafeEqual } from 'node:crypto'

/** Faster than this, a person cannot have filled in a form. */
export const MIN_FILL_MS = 3_000
/** After this, the form is treated as stale and has to be reloaded. */
export const MAX_AGE_MS = 24 * 60 * 60 * 1000

export type FormName = 'membership' | 'contact'
export type TokenCheck = 'ok' | 'too-fast' | 'expired' | 'invalid'

const sign = (secret: string, form: FormName, issued: string) =>
  createHmac('sha256', secret).update(`form-token|${form}|${issued}`).digest('base64url')

/** A signed timestamp, rendered into the form as a hidden field. */
export function issueFormToken(
  form: FormName,
  now = Date.now(),
  secret = process.env.PAYLOAD_SECRET ?? '',
): string {
  const issued = String(now)
  return `${issued}.${sign(secret, form, issued)}`
}

export function checkFormToken(
  form: FormName,
  token: string,
  now = Date.now(),
  secret = process.env.PAYLOAD_SECRET ?? '',
): TokenCheck {
  const [issued = '', signature = ''] = token.split('.')
  if (!secret || !/^\d{13}$/.test(issued)) return 'invalid'
  const expected = Buffer.from(sign(secret, form, issued))
  const given = Buffer.from(signature)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return 'invalid'
  const age = now - Number(issued)
  if (age < MIN_FILL_MS) return age < -60_000 ? 'invalid' : 'too-fast'
  if (age > MAX_AGE_MS) return 'expired'
  return 'ok'
}
