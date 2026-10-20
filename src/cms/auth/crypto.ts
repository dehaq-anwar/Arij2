import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto'

/**
 * Keys for the second factor, derived from MFA_ENCRYPTION_KEY (preferred, see .env.example) or,
 * if that is not set, from PAYLOAD_SECRET. Each purpose gets its own key (HKDF), so a key for
 * one purpose reveals nothing about another. Changing the source secret makes stored
 * authenticator secrets unreadable: every account then has to set up its second factor again.
 */
function key(purpose: string): Buffer {
  const source = process.env.MFA_ENCRYPTION_KEY || process.env.PAYLOAD_SECRET
  if (!source) throw new Error('MFA_ENCRYPTION_KEY or PAYLOAD_SECRET must be set')
  return Buffer.from(hkdfSync('sha256', source, 'yop-control-center', `mfa:${purpose}`, 32))
}

const b64 = (buffer: Buffer) => buffer.toString('base64url')
const unb64 = (text: string) => Buffer.from(text, 'base64url')

/**
 * AES-256-GCM. The account id is bound as associated data: a secret copied to another account
 * in the database does not decrypt there.
 */
export function encryptSecret(plain: Buffer, accountId: number | string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key('totp-secret'), iv)
  cipher.setAAD(Buffer.from(`account:${accountId}`))
  const data = Buffer.concat([cipher.update(plain), cipher.final()])
  return ['v1', b64(iv), b64(cipher.getAuthTag()), b64(data)].join('.')
}

export function decryptSecret(sealed: string, accountId: number | string): Buffer {
  const [version, iv, tag, data] = sealed.split('.')
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unknown secret format')
  const decipher = createDecipheriv('aes-256-gcm', key('totp-secret'), unb64(iv))
  decipher.setAAD(Buffer.from(`account:${accountId}`))
  decipher.setAuthTag(unb64(tag))
  return Buffer.concat([decipher.update(unb64(data)), decipher.final()])
}

/** Crockford base32: no I, L, O, U, so codes read aloud or typed by hand stay unambiguous. */
const RECOVERY_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export const RECOVERY_CODE_COUNT = 10

/** 10 characters from 32 = 50 random bits per code, shown as XXXXX-XXXXX. */
export function newRecoveryCode(): string {
  let code = ''
  for (let i = 0; i < 10; i++) code += RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)]
  return `${code.slice(0, 5)}-${code.slice(5)}`
}

/** Tolerates lower case, spaces, dashes and the usual look-alikes (O → 0, I/L → 1). */
export function normalizeRecoveryCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1')
  if (code.length !== 10) return null
  for (const char of code) if (!RECOVERY_ALPHABET.includes(char)) return null
  return code
}

/** Stored instead of the code: a keyed hash bound to the account (useless without the key). */
export function hashRecoveryCode(normalized: string, accountId: number | string): string {
  return createHmac('sha256', key('recovery-code'))
    .update(`${accountId}:${normalized}`)
    .digest('base64url')
}

/** Constant-time comparison of two strings of possibly different length. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) {
    // Still spend the time of a comparison so the length does not show in the timing.
    timingSafeEqual(left, left)
    return false
  }
  return timingSafeEqual(left, right)
}

/** The value of the device cookie is never stored, only this keyed hash of it. */
export const hashDeviceToken = (token: string) =>
  createHmac('sha256', key('device')).update(token).digest('base64url')

export const newDeviceToken = () => b64(randomBytes(32))
