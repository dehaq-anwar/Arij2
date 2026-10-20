import { jwtVerify } from 'jose'
import { JWT_AUTH_VERSION, type PayloadRequest } from 'payload'
import { parseCookies } from 'payload/shared'

export type TokenReference = { userId: number | string; sid: string; token: string }

/** The same places and order Payload reads its token from (header first, then the cookie). */
function extractToken(req: PayloadRequest): string | null {
  const header = req.headers.get('Authorization')
  if (header?.startsWith('JWT ')) return header.slice(4)
  if (header?.startsWith('Bearer ')) return header.slice(7)

  const cookie = parseCookies(req.headers).get(`${req.payload.config.cookiePrefix}-token`)
  if (!cookie) return null
  // Payload's own rule for cookies: a request with an Origin must come from an allowed origin;
  // without one, the browser must say it is not a cross-site request.
  const csrf = req.payload.config.csrf
  const origin = req.headers.get('Origin')
  if (origin) return csrf.length === 0 || csrf.includes(origin) ? cookie : null
  if (csrf.length === 0) return cookie
  const site = req.headers.get('Sec-Fetch-Site')
  return site === 'same-origin' || site === 'same-site' || site === 'none' ? cookie : null
}

/**
 * Reads the account and session of the token in the request without requiring the session to
 * be valid yet: after the password step the session is pending (see login.ts), so Payload does
 * not accept the token, but the second-factor endpoints need to know whose session it is.
 * The signature and expiry are checked exactly as Payload checks them.
 */
export async function readTokenReference(req: PayloadRequest): Promise<TokenReference | null> {
  const token = extractToken(req)
  if (!token) return null
  try {
    const { payload: claims, protectedHeader } = await jwtVerify(
      token,
      new TextEncoder().encode(req.payload.secret),
    )
    if (protectedHeader.authVersion !== JWT_AUTH_VERSION) return null
    const { id, collection, sid } = claims as { id?: unknown; collection?: unknown; sid?: unknown }
    if (collection !== 'users' || typeof sid !== 'string') return null
    if (typeof id !== 'number' && typeof id !== 'string') return null
    return { userId: id, sid, token }
  } catch {
    return null
  }
}
