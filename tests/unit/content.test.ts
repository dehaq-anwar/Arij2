import { describe, expect, it } from 'vitest'

import { isDraft, isPlaceholder } from '@/lib/markers'
import { SLUG_PATTERN, slugify } from '@/lib/slugify'

describe('slugify', () => {
  it('transliterates German umlauts and drops other accents', () => {
    expect(slugify('Jugend-Friedenscamp in Fürth 2026')).toBe('jugend-friedenscamp-in-fuerth-2026')
    expect(slugify('Straße & Begegnung')).toBe('strasse-begegnung')
    expect(slugify('Café Àrbeit')).toBe('cafe-arbeit')
  })

  it('collapses separators and trims hyphens', () => {
    expect(slugify('  --Hello,   World!--  ')).toBe('hello-world')
  })

  it('returns an empty slug for Arabic-only titles (the editor enters a Latin one)', () => {
    expect(slugify('مشروع السلام')).toBe('')
  })

  it('cuts long titles without leaving a trailing hyphen', () => {
    const slug = slugify('word '.repeat(40), 22)
    expect(slug.length).toBeLessThanOrEqual(22)
    expect(slug).toMatch(SLUG_PATTERN)
  })

  it('always produces slugs that match the pattern', () => {
    for (const title of ['Ä Ö Ü ä ö ü ß', 'Projekt 1/2', 'x', 'Peace & Youth – 2013']) {
      expect(slugify(title)).toMatch(SLUG_PATTERN)
    }
  })
})

describe('content markers', () => {
  it('recognises placeholders', () => {
    expect(isPlaceholder('[PLACEHOLDER: Anschrift]')).toBe(true)
    expect(isPlaceholder('  [PLACEHOLDER: x]')).toBe(true)
    expect(isPlaceholder('Anschrift [PLACEHOLDER]')).toBe(false)
  })

  it('recognises drafts in all three languages', () => {
    expect(isDraft('[ENTWURF] Text')).toBe(true)
    expect(isDraft('[DRAFT] Text')).toBe(true)
    expect(isDraft('[مسودة] نص')).toBe(true)
    expect(isDraft('Text [DRAFT]')).toBe(false)
  })
})
