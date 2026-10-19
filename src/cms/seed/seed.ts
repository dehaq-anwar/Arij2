import type { GlobalSlug, Payload } from 'payload'

import { placeholderArtwork } from './artwork'
import * as content from './content'
import { paragraphs } from './lexical'

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

/**
 * Five project slots with abstract placeholder images (never photos) and placeholder texts,
 * which the association replaces in the CMS. Created only while there are no projects at all;
 * never touches existing projects, also not with --force.
 */
async function seedPlaceholderProjects(payload: Payload, { log }: Options) {
  const { totalDocs } = await payload.count({ collection: 'projects' })
  if (totalDocs > 0) {
    log?.(`= projects: ${totalDocs} present, no placeholders added`)
    return
  }
  const now = Date.now()
  for (const [i, project] of content.placeholderProjects.entries()) {
    const image = await placeholderArtwork(i)
    // No shared `context` here: the storage plugin keeps per-upload state in the request
    // context, and a context object reused across uploads made it skip the later files.
    const media = await payload.create({
      collection: 'media',
      data: { decorative: true },
      file: {
        data: image,
        mimetype: 'image/jpeg',
        name: `${project.slug}.jpg`,
        size: image.length,
      },
    })
    const doc = await payload.create({
      collection: 'projects',
      locale: 'de',
      context,
      data: {
        title: project.title.de,
        slug: project.slug,
        excerpt: project.excerpt.de,
        body: paragraphs(project.body.de),
        coverImage: media.id,
        // Newest first: project 1 leads the list.
        publishedAt: new Date(now - i * 60_000).toISOString(),
        _status: 'published',
      },
    })
    for (const locale of ['en', 'ar'] as const) {
      await payload.update({
        collection: 'projects',
        id: doc.id,
        locale,
        context,
        data: {
          title: project.title[locale],
          excerpt: project.excerpt[locale],
          body: paragraphs(project.body[locale]),
          _status: 'published',
        },
      })
    }
  }
  log?.(`+ projects: ${content.placeholderProjects.length} placeholder slots created`)
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
  await seedPlaceholderProjects(payload, options)
}
