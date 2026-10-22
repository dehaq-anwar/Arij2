import type { Payload, Where } from 'payload'

import { isDraft, isPlaceholder } from './markers'

export type Unfinished = {
  /** e.g. "news/12" or "globals/navigation" */
  where: string
  /** Field path inside the document, with the language last, e.g. "title.ar". */
  path: string
  kind: 'placeholder' | 'draft'
  text: string
}

/**
 * Every "[PLACEHOLDER: …]" and every "[ENTWURF]" / "[DRAFT]" / "[مسودة]" text in a document,
 * at any depth (fields, blocks, arrays, rich text, all languages).
 */
export function findUnfinished(where: string, doc: unknown): Unfinished[] {
  const found: Unfinished[] = []
  const walk = (value: unknown, path: string[]) => {
    if (typeof value === 'string') {
      const kind = isPlaceholder(value) ? 'placeholder' : isDraft(value) ? 'draft' : null
      if (kind) found.push({ where, path: path.join('.'), kind, text: value.trim().slice(0, 80) })
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, [...path, String(i)]))
    } else if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) walk(item, [...path, key])
    }
  }
  walk(doc, [])
  return found
}

/**
 * What visitors can see: published entries, partners whose permission is confirmed, team
 * members who consented to publication, every image, and the website's settings and texts. The
 * former page globals are left out (the pages replaced them; they are kept read-only).
 */
const COLLECTIONS: { slug: string; where?: Where }[] = [
  { slug: 'pages', where: { _status: { equals: 'published' } } },
  { slug: 'projects', where: { _status: { equals: 'published' } } },
  { slug: 'news', where: { _status: { equals: 'published' } } },
  { slug: 'events', where: { _status: { equals: 'published' } } },
  { slug: 'focus-areas' },
  { slug: 'statistics' },
  { slug: 'team-members', where: { publishConsent: { equals: true } } },
  { slug: 'partners', where: { permissionConfirmed: { equals: true } } },
  { slug: 'media' },
]
const GLOBALS = ['navigation', 'form-texts', 'legal-notice', 'privacy-policy', 'site-settings']

/** The launch gate on the content itself (docs/OPERATIONS.md §11): what is still unfinished. */
export async function unfinishedContent(payload: Payload): Promise<Unfinished[]> {
  const found: Unfinished[] = []
  for (const { slug, where } of COLLECTIONS) {
    const { docs } = await payload.find({
      collection: slug as never,
      where,
      locale: 'all',
      fallbackLocale: false,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    for (const doc of docs as { id: number | string }[]) {
      found.push(...findUnfinished(`${slug}/${doc.id}`, doc))
    }
  }
  for (const slug of GLOBALS) {
    const doc = await payload.findGlobal({
      slug: slug as never,
      locale: 'all',
      fallbackLocale: false,
      depth: 0,
      overrideAccess: true,
    })
    found.push(...findUnfinished(`globals/${slug}`, doc))
  }
  return found
}
