import type { GlobalSlug, Payload } from 'payload'

import * as content from './content'

type PerLocale = Record<content.SeedLocale, Record<string, unknown>>
type Options = { force?: boolean; log?: (message: string) => void }

const context = { disableRevalidate: true }

/**
 * Array rows (e.g. the timeline) are shared between languages: the German pass creates them,
 * the English and Arabic passes fill the same rows (matched by id) with their texts.
 */
function withRowIds(
  data: Record<string, unknown>,
  saved: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...data }
  for (const [key, value] of Object.entries(data)) {
    const rows = saved[key]
    if (Array.isArray(value) && Array.isArray(rows)) {
      result[key] = value.map((row, i) => ({
        ...(row as object),
        id: (rows[i] as { id?: string })?.id,
      }))
    }
  }
  return result
}

async function seedGlobal(
  payload: Payload,
  slug: GlobalSlug,
  data: PerLocale,
  { force, log }: Options,
) {
  const existing = (await payload.findGlobal({ slug, locale: 'de', depth: 0 })) as {
    updatedAt?: string
  }
  if (existing.updatedAt && !force) {
    log?.(`= ${slug}: has content, left unchanged`)
    return
  }
  await payload.updateGlobal({ slug, locale: 'de', data: data.de, depth: 0, context })
  const saved = (await payload.findGlobal({ slug, locale: 'de', depth: 0 })) as unknown as Record<
    string,
    unknown
  >
  for (const locale of ['en', 'ar'] as const) {
    await payload.updateGlobal({
      slug,
      locale,
      data: withRowIds(data[locale], saved),
      depth: 0,
      context,
    })
  }
  log?.(`+ ${slug}: seeded in de, en, ar`)
}

async function seedFocusAreas(payload: Payload, { force, log }: Options) {
  const { totalDocs } = await payload.count({ collection: 'focus-areas' })
  if (totalDocs > 0 && !force) {
    log?.(`= focus-areas: ${totalDocs} present, left unchanged`)
    return
  }
  if (force)
    await payload.delete({ collection: 'focus-areas', where: { id: { exists: true } }, context })
  for (const area of content.focusAreas) {
    const doc = await payload.create({
      collection: 'focus-areas',
      locale: 'de',
      data: {
        icon: area.icon as 'youth',
        order: area.order,
        title: area.title.de,
        summary: area.summary.de,
      },
      context,
    })
    for (const locale of ['en', 'ar'] as const) {
      await payload.update({
        collection: 'focus-areas',
        id: doc.id,
        locale,
        data: { title: area.title[locale], summary: area.summary[locale] },
        context,
      })
    }
  }
  log?.(`+ focus-areas: ${content.focusAreas.length} created`)
}

/** Fills an empty CMS with the initial content. Safe to run again: existing content is kept. */
export async function seed(payload: Payload, options: Options = {}) {
  const siteSettings: PerLocale = {
    ...content.siteSettings,
    de: {
      ...content.siteSettings.de,
      contact: { ...(content.siteSettings.de.contact as object), email: content.contactEmail },
    },
  }
  await seedGlobal(payload, 'site-settings', siteSettings, options)
  await seedGlobal(payload, 'home-page', content.homePage, options)
  await seedGlobal(payload, 'about-page', content.aboutPage, options)
  await seedGlobal(payload, 'membership-page', content.membershipPage, options)
  await seedGlobal(payload, 'support-page', content.supportPage, options)
  await seedGlobal(payload, 'contact-page', content.contactPage, options)
  await seedGlobal(payload, 'legal-notice', content.legalNotice, options)
  await seedGlobal(payload, 'privacy-policy', content.privacyPolicy, options)
  await seedFocusAreas(payload, options)
}
