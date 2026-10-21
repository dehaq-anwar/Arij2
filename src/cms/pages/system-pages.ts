import type { Payload, PayloadRequest } from 'payload'

import ar from '@/i18n/messages/ar.json'
import de from '@/i18n/messages/de.json'
import en from '@/i18n/messages/en.json'
import { routing, type Locale } from '@/i18n/routing'
import { SYSTEM_PAGES, type SystemPage } from '@/lib/site-routes'
import type { AboutPage, ContactPage, HomePage, MembershipPage, SupportPage } from '@/payload-types'

import { audit } from '../audit/log'
import { SYSTEM_PAGE } from '../collections/Pages'

/**
 * The five fixed pages of the website as pages of the page builder (CC-2). Until CC-2 their
 * texts lived in one global per page; the first start after the update builds the pages from
 * those texts, block by block, in all three languages, so that the website looks exactly as
 * before. The globals stay (hidden and read-only) as the record of the old state.
 *
 * The order of blocks is the same in every language (it follows the German page); texts come
 * from each language. A required text missing in a language takes the German one — which is
 * also what visitors saw until now (fallback to German).
 */

export type LegacyPages = {
  home: HomePage
  about: AboutPage
  membership: MembershipPage
  support: SupportPage
  contact: ContactPage
}
const GLOBAL_OF: Record<SystemPage, keyof LegacyPages & string> = {
  home: 'home',
  about: 'about',
  membership: 'membership',
  support: 'support',
  contact: 'contact',
}
const SLUG_OF: Record<SystemPage, `${SystemPage}-page`> = {
  home: 'home-page',
  about: 'about-page',
  membership: 'membership-page',
  support: 'support-page',
  contact: 'contact-page',
}

const MESSAGES = { de, en, ar } as const

type Row = Record<string, unknown> & { blockType: string }
export type PageData = { title: string; layout: Row[] }

/** A required text: this language's, otherwise the German one. */
const pick = (own: string | null | undefined, german: string | null | undefined) =>
  own?.trim() ? own : (german ?? '')

const route = (labelText: string, target: string) => ({
  label: labelText,
  kind: 'route',
  route: target,
})

function layoutOf(
  key: SystemPage,
  german: LegacyPages,
  own: LegacyPages,
  locale: Locale,
): PageData {
  const m = MESSAGES[locale]
  const nav = m.Navigation
  switch (key) {
    case 'home': {
      const d = german.home
      const o = own.home
      return {
        title: nav.home,
        layout: [
          {
            blockType: 'hero',
            headline: pick(o.hero?.headline, d.hero?.headline) || 'Youth of Peace e.V.',
            showTagline: true,
            buttons: [route(nav.membership, '/membership'), route(nav.support, '/support')],
          },
          ...(d.journey?.from && d.journey?.to
            ? [
                {
                  blockType: 'journey',
                  from: pick(o.journey?.from, d.journey.from),
                  to: pick(o.journey?.to, d.journey.to),
                },
              ]
            : []),
          { blockType: 'projects' },
          { blockType: 'focusAreas', variant: 'names' },
          { blockType: 'stats', heading: o.statsHeading ?? null },
          { blockType: 'news', count: '3' },
          {
            blockType: 'callToAction',
            heading: o.cta?.heading ?? null,
            buttons: [
              route(nav.membership, '/membership'),
              route(nav.support, '/support'),
              route(nav.contact, '/contact'),
            ],
          },
        ],
      }
    }
    case 'about': {
      const d = german.about
      const o = own.about
      return {
        title: nav.about,
        layout: [
          { blockType: 'header', showTagline: true },
          ...(d.mission?.trim() || d.intro
            ? [{ blockType: 'statement', statement: o.mission ?? null, body: o.intro }]
            : []),
          ...(d.story?.length
            ? [
                {
                  blockType: 'timeline',
                  entries: d.story.map((entry, i) => ({
                    year: entry.year ?? null,
                    title: pick(o.story?.[i]?.title, entry.title),
                    text: o.story?.[i]?.text ?? null,
                  })),
                },
              ]
            : []),
          ...(d.values?.length
            ? [
                {
                  blockType: 'values',
                  items: d.values.map((value, i) => ({
                    title: pick(o.values?.[i]?.title, value.title),
                    description: o.values?.[i]?.description ?? null,
                  })),
                },
              ]
            : []),
          { blockType: 'focusAreas', variant: 'details' },
          { blockType: 'board', intro: o.boardIntro ?? null },
        ],
      }
    }
    case 'membership': {
      const o = own.membership
      const t = m.Membership
      return {
        title: nav.membership,
        layout: [
          { blockType: 'header' },
          {
            blockType: 'cards',
            intro: o.intro,
            numbered: true,
            items: [
              { heading: t.whoCanJoinHeading, text: o.whoCanJoin },
              { heading: t.feesHeading, text: o.fees },
              { heading: t.processHeading, text: o.process },
            ],
          },
          { blockType: 'membershipForm', heading: t.applyHeading, note: o.formNote ?? null },
        ],
      }
    }
    case 'support': {
      const d = german.support
      const o = own.support
      const contact = route(m.Support.contactCta, '/contact')
      return {
        title: nav.support,
        layout: [
          { blockType: 'header' },
          {
            blockType: 'cards',
            intro: o.intro,
            numbered: false,
            items: [
              {
                heading: o.volunteer?.heading ?? null,
                text: o.volunteer?.text,
                icon: 'community',
                buttons: [contact],
              },
              {
                heading: o.partner?.heading ?? null,
                text: o.partner?.text,
                icon: 'integration',
                buttons: [contact],
              },
            ],
          },
          {
            blockType: 'donation',
            heading: o.donate?.heading ?? null,
            body: o.donate?.text,
            accountHolder: d.donate?.accountHolder ?? null,
            bankName: d.donate?.bankName ?? null,
            iban: d.donate?.iban ?? null,
            bic: d.donate?.bic ?? null,
            reference: o.donate?.reference ?? null,
            taxStatusNote: o.donate?.taxStatusNote,
          },
          { blockType: 'partners' },
        ],
      }
    }
    case 'contact': {
      const o = own.contact
      const d = german.contact
      return {
        title: nav.contact,
        layout: [
          { blockType: 'header' },
          {
            blockType: 'contactForm',
            intro: o.intro,
            officeHours: o.officeHours ?? null,
            showEmail: d.showEmail ?? true,
            showPhone: d.showPhone ?? false,
            showAddress: d.showAddress ?? true,
          },
        ],
      }
    }
  }
}

/** The page in one language, built from the old texts (German decides the order of blocks). */
export function systemPageData(
  key: SystemPage,
  german: LegacyPages,
  own: LegacyPages,
  locale: Locale,
): PageData {
  return layoutOf(key, german, own, locale)
}

/** The old texts of all five pages in one language (no fallback: empty stays empty). */
export async function legacyPages(
  payload: Payload,
  locale: Locale,
  { fallback = false, req }: { fallback?: boolean; req?: PayloadRequest } = {},
): Promise<LegacyPages> {
  const entries = await Promise.all(
    SYSTEM_PAGES.map(async (key) => [
      GLOBAL_OF[key],
      await payload.findGlobal({
        slug: SLUG_OF[key],
        locale,
        fallbackLocale: fallback ? 'de' : false,
        depth: 0,
        overrideAccess: true,
        ...(req ? { req } : {}),
      }),
    ]),
  )
  return Object.fromEntries(entries) as LegacyPages
}

/**
 * Ids of array and block rows from the saved German page into another language's data, so that
 * the other language fills the same rows instead of replacing them.
 */
export function withRowIds<T>(data: T, saved: unknown): T {
  if (Array.isArray(data)) {
    const rows = Array.isArray(saved) ? saved : []
    return data.map((item, i) => {
      if (!item || typeof item !== 'object') return item
      const savedRow = rows[i] as Record<string, unknown> | undefined
      return { ...withRowIds(item, savedRow), id: savedRow?.id }
    }) as T
  }
  if (data && typeof data === 'object') {
    const target = data as Record<string, unknown>
    const source = (saved ?? {}) as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(target).map(([key, value]) => [
        key,
        Array.isArray(value) ? withRowIds(value, source[key]) : value,
      ]),
    ) as T
  }
  return data
}

const hasContent = (global: { updatedAt?: string | null }) => Boolean(global.updatedAt)

/**
 * Creates the fixed pages that do not exist yet from the old texts — only when those texts were
 * ever saved (an empty new installation gets its pages from the seed). Published at once, so the
 * website does not change. Safe to run again: existing pages are never touched.
 */
export async function ensureSystemPages(
  payload: Payload,
  { log }: { log?: (message: string) => void } = {},
): Promise<SystemPage[]> {
  const { docs } = await payload.find({
    collection: 'pages',
    where: { systemKey: { exists: true } },
    depth: 0,
    limit: 10,
    overrideAccess: true,
    draft: true,
    select: { systemKey: true },
  })
  const present = new Set(docs.map((doc) => doc.systemKey))
  const missing = SYSTEM_PAGES.filter((key) => !present.has(key))
  if (!missing.length) return []

  const german = await legacyPages(payload, 'de')
  const byLocale = Object.fromEntries(
    await Promise.all(
      routing.locales.map(async (locale) => [
        locale,
        locale === 'de' ? german : await legacyPages(payload, locale),
      ]),
    ),
  ) as Record<Locale, LegacyPages>

  const created: SystemPage[] = []
  for (const key of missing) {
    if (!hasContent(german[GLOBAL_OF[key]])) continue
    const context = { [SYSTEM_PAGE]: true, disableRevalidate: true }
    try {
      const first = systemPageData(key, german, german, 'de')
      const page = await payload.create({
        collection: 'pages',
        locale: 'de',
        data: { ...first, systemKey: key, slug: key, _status: 'published' } as never,
        overrideAccess: true,
        context,
      })
      for (const locale of routing.locales.filter((l) => l !== 'de')) {
        const data = systemPageData(key, german, byLocale[locale], locale)
        await payload.update({
          collection: 'pages',
          id: page.id,
          locale,
          data: {
            ...data,
            layout: withRowIds(data.layout, page.layout),
            _status: 'published',
          } as never,
          overrideAccess: true,
          context,
        })
      }
      created.push(key)
      log?.(`+ pages: "${key}" built from its former texts`)
    } catch (error) {
      // Another server process may have created it at the same moment (systemKey is unique).
      payload.logger.warn({ err: error }, `Could not build the "${key}" page from its former texts`)
    }
  }
  if (created.length) {
    await audit(payload, {
      action: 'pages.fromGlobals',
      area: 'content',
      detail: { pages: created },
    })
  }
  return created
}
