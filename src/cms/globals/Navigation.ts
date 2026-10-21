import type { ArrayFieldValidation, Field, GlobalConfig, Payload } from 'payload'

import ar from '@/i18n/messages/ar.json'
import de from '@/i18n/messages/de.json'
import en from '@/i18n/messages/en.json'
import { routing } from '@/i18n/routing'
import { mainNav, membershipLink } from '@/lib/navigation'

import { allow } from '../access/roles'
import { linkFields } from '../blocks/fields'
import { hiddenWithoutContent } from '../collections/content-access'
import { revalidateGlobal } from '../hooks/revalidate'
import { groups, label, localizedMessage } from '../lib/labels'
import { withRowIds } from '../pages/system-pages'

/**
 * The menu has to fit one line next to the logo and the button from 1024 px wide (below that it
 * is behind the menu button): at most six entries, short labels, and not too many letters in all
 * (checked per language; tests/e2e/pages.spec.ts measures the longest allowed menu).
 */
const MAX_LABEL = 20
const MAX_ENTRIES = 6
export const MAX_MENU_LETTERS = 56

const menuFits: ArrayFieldValidation = (value, { req }) => {
  const rows = (Array.isArray(value) ? value : []) as { label?: string | null }[]
  // A field's own check replaces Payload's, so the number of rows is checked here too.
  if (rows.length > MAX_ENTRIES) {
    return localizedMessage(
      label(
        `Höchstens ${MAX_ENTRIES} Einträge.`,
        `At most ${MAX_ENTRIES} entries.`,
        `${MAX_ENTRIES} عناصر كحد أقصى.`,
      ),
      req,
    )
  }
  const letters = rows.reduce((sum, row) => sum + (row.label?.trim().length ?? 0), 0)
  return letters <= MAX_MENU_LETTERS
    ? true
    : localizedMessage(
        label(
          `Die Einträge sind zusammen zu lang (${letters} von höchstens ${MAX_MENU_LETTERS} Zeichen): Das Menü passt sonst nicht in eine Zeile.`,
          `The entries are too long together (${letters} of at most ${MAX_MENU_LETTERS} characters): otherwise the menu does not fit on one line.`,
          `العناصر طويلة جدًا مجتمعة (${letters} من أصل ${MAX_MENU_LETTERS} حرفًا كحد أقصى)، وإلا فلن تتسع القائمة في سطر واحد.`,
        ),
        req,
      )
}
const shortLabels = (fields: Field[]): Field[] =>
  fields.map((field) => {
    if (field.type === 'row') return { ...field, fields: shortLabels(field.fields) }
    if ('name' in field && field.name === 'label')
      return { ...field, maxLength: MAX_LABEL } as Field
    return field
  })

/**
 * The website's menu (CC-2): its entries and the highlighted button, in three languages. The
 * links to the legal notice and the privacy policy are not part of it: they are always in the
 * footer. Until it is first saved, the website shows its usual menu.
 */
export const Navigation: GlobalConfig = {
  slug: 'navigation',
  label: label('Navigation', 'Navigation', 'التنقل'),
  admin: {
    group: groups.pages,
    hidden: hiddenWithoutContent,
    description: label(
      'Menü oben auf jeder Seite und im Fußbereich. Impressum und Datenschutz stehen immer im Fußbereich.',
      'Menu at the top of every page and in the footer. Legal notice and privacy policy are always in the footer.',
      'القائمة أعلى كل صفحة وفي التذييل. الإشعار القانوني وسياسة الخصوصية موجودان دائمًا في التذييل.',
    ),
  },
  versions: { max: 50 },
  access: { read: () => true, update: allow('content.write') },
  hooks: { afterChange: [revalidateGlobal] },
  fields: [
    {
      name: 'main',
      type: 'array',
      maxRows: MAX_ENTRIES,
      validate: menuFits,
      label: label('Menüeinträge', 'Menu entries', 'عناصر القائمة'),
      labels: {
        singular: label('Eintrag', 'Entry', 'عنصر'),
        plural: label('Einträge', 'Entries', 'العناصر'),
      },
      fields: shortLabels(linkFields()),
    },
    {
      name: 'cta',
      type: 'group',
      label: label('Hervorgehobene Schaltfläche', 'Highlighted button', 'الزر البارز'),
      fields: shortLabels(linkFields()),
    },
  ],
}

const MESSAGES = { de, en, ar } as const

/** Writes the website's usual menu into the global the first time, so editors start from it. */
export async function ensureNavigation(payload: Payload): Promise<boolean> {
  const current = (await payload.findGlobal({
    slug: 'navigation',
    depth: 0,
    overrideAccess: true,
  })) as { updatedAt?: string | null }
  if (current.updatedAt) return false
  const data = (locale: keyof typeof MESSAGES) => {
    const nav = MESSAGES[locale].Navigation as Record<string, string>
    return {
      main: mainNav.map(({ href, key }) => ({ label: nav[key], kind: 'route', route: href })),
      cta: { label: nav[membershipLink.key], kind: 'route', route: membershipLink.href },
    }
  }
  const saved = await payload.updateGlobal({
    slug: 'navigation',
    locale: 'de',
    data: data('de') as never,
    overrideAccess: true,
    context: { disableRevalidate: true },
  })
  for (const locale of routing.locales.filter((l) => l !== 'de')) {
    const own = data(locale)
    await payload.updateGlobal({
      slug: 'navigation',
      locale,
      data: { ...own, main: withRowIds(own.main, (saved as { main?: unknown }).main) } as never,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
  }
  return true
}
