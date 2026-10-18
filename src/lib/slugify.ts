const germanLetters: Record<string, string> = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  ß: 'ss',
  Ä: 'Ae',
  Ö: 'Oe',
  Ü: 'Ue',
}

/** Lowercase ASCII words joined by single hyphens, e.g. "jugend-friedenscamp-2026". */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * URL slug from a title. German umlauts are transliterated (ä → ae), other accents dropped.
 * Arabic titles yield an empty slug: the editor then enters a Latin one.
 */
export function slugify(input: string, maxLength = 80): string {
  return input
    .replace(/[äöüßÄÖÜ]/g, (c) => germanLetters[c] ?? c)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/, '')
}
