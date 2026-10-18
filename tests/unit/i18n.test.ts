import { describe, expect, it } from 'vitest'

import { getDirection, getIntlLocale, localeNames } from '@/i18n/locale'
import ar from '@/i18n/messages/ar.json'
import de from '@/i18n/messages/de.json'
import en from '@/i18n/messages/en.json'
import { routing } from '@/i18n/routing'

const keys = (obj: object, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v as object, `${prefix}${k}.`) : [`${prefix}${k}`],
  )

describe('messages', () => {
  it('have exactly the same keys in all languages', () => {
    const reference = keys(de).sort()
    expect(keys(en).sort()).toEqual(reference)
    expect(keys(ar).sort()).toEqual(reference)
  })

  it('isolate the Latin site name in Arabic, so "e.V." keeps its full stop at the end', () => {
    expect(ar.Metadata.siteName).toBe('\u2066Youth of Peace e.V.\u2069')
  })

  it('have no empty strings', () => {
    for (const messages of [de, en, ar]) {
      const flat = JSON.stringify(messages)
      expect(flat).not.toContain('""')
    }
  })
})

describe('routing', () => {
  it('serves German as the default locale without prefix', () => {
    expect(routing.defaultLocale).toBe('de')
    expect(routing.localePrefix).toBe('as-needed')
  })

  it('sets no locale cookie and does no Accept-Language detection', () => {
    expect(routing.localeCookie).toBe(false)
    expect(routing.localeDetection).toBe(false)
  })

  it('defines a path for every locale on every route', () => {
    for (const [internal, localized] of Object.entries(routing.pathnames ?? {})) {
      if (typeof localized === 'string') continue
      expect(Object.keys(localized).sort(), internal).toEqual([...routing.locales].sort())
    }
  })

  it('uses only lowercase ASCII paths (shareable, no %-encoding)', () => {
    for (const localized of Object.values(routing.pathnames ?? {})) {
      const paths = typeof localized === 'string' ? [localized] : Object.values(localized)
      for (const p of paths) expect(p).toMatch(/^\/[a-z0-9\-/[\]]*$/)
    }
  })
})

describe('locale helpers', () => {
  it('marks only Arabic as right-to-left', () => {
    expect(getDirection('ar')).toBe('rtl')
    expect(getDirection('de')).toBe('ltr')
    expect(getDirection('en')).toBe('ltr')
  })

  it('formats Arabic numbers with Western digits', () => {
    const formatted = new Intl.NumberFormat(getIntlLocale('ar')).format(1234567)
    expect(formatted).toMatch(/1.?234.?567/)
    expect(formatted).not.toMatch(/[\u0660-\u0669]/) // Arabic-Indic digits ٠–٩
  })

  it('names each language in its own language', () => {
    expect(localeNames).toEqual({ de: 'Deutsch', en: 'English', ar: 'العربية' })
  })
})
