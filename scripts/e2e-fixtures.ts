// Test data for the end-to-end tests. Runs only against a database whose name ends in "_e2e"
// (scripts/e2e-server.mjs prepares it); everything here is invented test data, clearly named
// "E2E", and must never reach the real CMS.
import { getPayload } from 'payload'

import { paragraphs } from '../src/cms/seed/lexical'
import { seed } from '../src/cms/seed/seed'
import config from '../src/payload.config'

const database = new URL(process.env.DATABASE_URL ?? 'postgres://invalid/').pathname.slice(1)
if (!database.endsWith('_e2e')) {
  console.error(`Refusing to write test data into "${database}": the name must end in "_e2e".`)
  process.exit(1)
}
const editorPassword = process.env.E2E_EDITOR_PASSWORD
if (!editorPassword) {
  console.error('E2E_EDITOR_PASSWORD is not set.')
  process.exit(1)
}

const payload = await getPayload({ config })
const context = { disableRevalidate: true }

await seed(payload, { force: true })

const [focusArea] = (await payload.find({ collection: 'focus-areas', sort: 'order', limit: 1 }))
  .docs

// Translated into all three languages.
const translated = await payload.create({
  collection: 'projects',
  locale: 'de',
  context,
  data: {
    title: 'E2E Testprojekt',
    slug: 'e2e-testprojekt',
    excerpt: 'E2E Kurzbeschreibung',
    stage: 'ongoing',
    location: 'E2E Ort',
    startDate: '2026-03-01T12:00:00.000Z',
    focusAreas: focusArea ? [focusArea.id] : [],
    body: paragraphs('E2E Projekttext auf Deutsch.'),
    _status: 'published',
  },
})
for (const [locale, title] of [
  ['en', 'E2E Test project'],
  ['ar', 'مشروع اختبار E2E'],
] as const) {
  await payload.update({
    collection: 'projects',
    id: translated.id,
    locale,
    context,
    data: {
      title,
      excerpt: `${title} – excerpt`,
      body: paragraphs(`${title} – body`),
      _status: 'published',
    },
  })
}

// German only: the English and Arabic pages fall back to German with a notice.
await payload.create({
  collection: 'projects',
  locale: 'de',
  context,
  data: {
    title: 'E2E Nur Deutsch',
    slug: 'e2e-nur-deutsch',
    excerpt: 'E2E nur auf Deutsch',
    stage: 'planned',
    body: paragraphs('E2E Text nur auf Deutsch.'),
    _status: 'published',
  },
})

// Never published: must not be visible anywhere.
await payload.create({
  collection: 'projects',
  locale: 'de',
  context,
  draft: true,
  data: {
    title: 'E2E Unveröffentlicht',
    slug: 'e2e-unveroeffentlicht',
    excerpt: 'E2E Entwurf',
    stage: 'planned',
    _status: 'draft',
  },
})

const post = await payload.create({
  collection: 'news',
  locale: 'de',
  context,
  data: {
    title: 'E2E Testbeitrag',
    slug: 'e2e-testbeitrag',
    excerpt: 'E2E Beitrag Kurzfassung',
    body: paragraphs('E2E Beitragstext.'),
    relatedProjects: [translated.id],
    publishedAt: '2026-10-01T10:00:00.000Z',
    _status: 'published',
  },
})
await payload.update({
  collection: 'news',
  id: post.id,
  locale: 'en',
  context,
  data: {
    title: 'E2E Test post',
    excerpt: 'E2E post summary',
    body: paragraphs('E2E post text.'),
    _status: 'published',
  },
})

await payload.create({
  collection: 'statistics',
  locale: 'de',
  context,
  data: {
    label: 'E2E Kennzahl',
    value: 1234,
    asOf: '2026-09-30T12:00:00.000Z',
    source: 'E2E interne Quelle',
    showOnHome: true,
  },
})

for (const [name, publishConsent] of [
  ['E2E Mit Einwilligung', true],
  ['E2E Ohne Einwilligung', false],
] as const) {
  await payload.create({
    collection: 'team-members',
    locale: 'de',
    context,
    data: { name, position: 'E2E Vorstand', group: 'board', publishConsent },
  })
}

for (const [name, permissionConfirmed] of [
  ['E2E Partner bestätigt', true],
  ['E2E Partner unbestätigt', false],
] as const) {
  await payload.create({
    collection: 'partners',
    locale: 'de',
    context,
    data: { name, permissionConfirmed },
  })
}

// The first account becomes an admin; the tests sign in as the editor created after it.
await payload.create({
  collection: 'users',
  data: {
    name: 'E2E Admin',
    email: 'e2e-admin@example.test',
    password: crypto.randomUUID(),
    role: 'admin',
  },
})
await payload.create({
  collection: 'users',
  data: {
    name: 'E2E Redaktion',
    email: 'e2e-editor@example.test',
    password: editorPassword,
    role: 'editor',
  },
})

payload.logger.info('E2E fixtures created.')
process.exit(0)
