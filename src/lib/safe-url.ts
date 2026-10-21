const SCHEMES = ['https:', 'http:', 'mailto:', 'tel:']

/**
 * Links editors may enter in texts and buttons: web pages (https, http), e-mail and phone, paths
 * on this site ("/kontakt") and anchors on the same page ("#spenden"). Everything else — above
 * all javascript: and data: URLs — is refused when saving and not rendered as a link.
 */
export function isSafeUrl(url: unknown, { relative = true } = {}): url is string {
  if (typeof url !== 'string') return false
  const value = url.trim()
  if (!value || value.length > 2000 || /\s/.test(value)) return false
  if (value.startsWith('/')) return relative && !value.startsWith('//') && !value.includes('\\')
  if (value.startsWith('#')) return relative && /^#[\w-]+$/.test(value)
  try {
    const parsed = new URL(value)
    if (!SCHEMES.includes(parsed.protocol)) return false
    if (parsed.protocol === 'mailto:' || parsed.protocol === 'tel:') return parsed.pathname !== ''
    return parsed.hostname.includes('.') && !parsed.username && !parsed.password
  } catch {
    return false
  }
}

/** The link target if it is safe, otherwise undefined (the text is shown without a link). */
export const safeHref = (url: unknown) => (isSafeUrl(url) ? url.trim() : undefined)
