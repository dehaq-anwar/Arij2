/**
 * Log lines leave the agent only masked (docs/CONTROL-CENTER.md §4: the technical administrator
 * sees no personal data, logs shown to them are masked). What is masked: e-mail addresses (first
 * letter and domain stay), IP addresses (network part stays), tokens and secrets of every kind
 * (JWTs, bearer and basic credentials, values of password/token/key/secret parameters, cookies,
 * long hex or base64 strings) and passwords in connection strings. Lines are also shortened.
 */
export const MAX_LINE = 2000

const rules: [RegExp, string | ((match: string, ...groups: string[]) => string)][] = [
  // Connection strings with a password: scheme://user:password@host
  [/\b([a-z][a-z0-9+.-]*:\/\/[^\s:/@]+):[^\s@/]+@/gi, '$1:[hidden]@'],
  // JSON Web Tokens and Payload's session tokens.
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, '[token]'],
  // Authorization headers.
  [/\b(Bearer|Basic|JWT)\s+[A-Za-z0-9._~+/=-]{8,}/gi, '$1 [hidden]'],
  // Cookies.
  [/\b(cookie|set-cookie)(["']?\s*[:=]\s*["']?)[^"'\n]+/gi, '$1$2[hidden]'],
  // key=value or "key": "value" for secret-like keys (also in query strings). Whole words only,
  // so that e.g. "statusCode" stays readable.
  [
    /\b([a-z0-9_-]*(?:password|passwd|secret|token|apikey|api_key|access_key|private_key|signature)[a-z0-9_-]*|otp|code|sid|session|sessionid)(["']?\s*[:=]\s*["']?)([^\s"'&,;}]+)/gi,
    (_m, key: string, sep: string) => `${key}${sep}[hidden]`,
  ],
  // E-mail addresses: i***@example.org
  [
    /\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g,
    (_m, first: string, domain: string) => `${first}***@${domain}`,
  ],
  // IPv4: keep the first three octets.
  [
    /\b((?:25[0-5]|2[0-4]\d|1?\d?\d)\.(?:25[0-5]|2[0-4]\d|1?\d?\d)\.(?:25[0-5]|2[0-4]\d|1?\d?\d))\.(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
    '$1.x',
  ],
  // IPv6 (at least three groups): keep the first three groups.
  [
    /\b([0-9a-f]{1,4}:[0-9a-f]{1,4}:[0-9a-f]{1,4}):(?:[0-9a-f]{0,4}:){1,5}[0-9a-f]{0,4}\b/gi,
    '$1:x',
  ],
  // Long hex or base64 strings (keys, hashes, one-time values); paths and slugs stay, because a
  // secret mixes upper case, lower case and digits.
  [/\b[0-9a-f]{32,}\b/gi, '[secret]'],
  [
    /[A-Za-z0-9+_-]{32,}={0,2}/g,
    (match: string) =>
      /[A-Z]/.test(match) && /[a-z]/.test(match) && /\d/.test(match) ? '[secret]' : match,
  ],
]

export function maskLine(line: string): string {
  let masked = line.length > MAX_LINE ? `${line.slice(0, MAX_LINE)} …` : line
  for (const [pattern, replacement] of rules) {
    masked = masked.replace(pattern, replacement as string)
  }
  // Control characters (e.g. terminal colours) are dropped.
  return masked.replace(/\u001b\[[0-9;]*m/g, '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
}
