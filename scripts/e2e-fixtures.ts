// Test data for the end-to-end tests. Runs only against a database whose name ends in "_e2e"
// (scripts/e2e-server.mjs prepares it); everything here is invented test data, clearly named
// "E2E", and must never reach the real CMS.
import { writeFileSync } from 'node:fs'
import path from 'node:path'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

import { SKIP_AUDIT } from '../src/cms/audit/log'
import { createCredential } from '../src/cms/auth/mfa'
import { SERVER_COMMAND } from '../src/cms/collections/Users'
import { paragraphs } from '../src/cms/seed/lexical'
import { seed } from '../src/cms/seed/seed'
import config from '../src/payload.config'
import {
  ROLE_ACCOUNTS,
  SCENARIO_ACCOUNTS,
  STATE_FILE,
  testEmail,
  testTotpSecret,
  type AccountName,
  type E2EState,
} from '../tests/e2e/secrets'

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

// Accounts: scripts create them with the server-command flag (there is no open sign-up).
// Every test worker has its own accounts (Payload stores sessions in the account; parallel
// sign-ins to one account could overwrite each other): one per role, plus accounts for single
// scenarios. All share the password generated for the run; their second factor is set up here
// with a secret the tests can derive (tests/e2e/secrets.ts), exactly as an enrolment stores it.
const state: E2EState = { recoveryCodes: {}, resetTokens: {} }
const accountIds = new Map<string, number>()
for (let worker = 0; worker < 8; worker++) {
  const accounts = [
    ...Object.entries(ROLE_ACCOUNTS).map(([key, name]) => ({
      key,
      name,
      role: key,
      enrolled: true,
    })),
    ...Object.entries(SCENARIO_ACCOUNTS).map(([key, a]) => ({ key, ...a })),
  ]
  for (const { key, name, role, enrolled } of accounts) {
    const email = testEmail(key as AccountName, worker)
    const user = await payload.create({
      collection: 'users',
      data: {
        name,
        email,
        password: editorPassword,
        role: role as never,
        disabled: key === 'disabled',
      },
      context: { [SERVER_COMMAND]: true },
    })
    accountIds.set(`${key}-${worker}`, user.id)
    if (!enrolled) continue
    const codes = await createCredential(
      payload,
      user.id,
      testTotpSecret(editorPassword, email),
      -1,
    )
    if (key === 'recovery') state.recoveryCodes[email] = codes
    if (key === 'reset') {
      state.resetTokens[email] = await payload.forgotPassword({
        collection: 'users',
        data: { email },
        disableEmail: true,
        context: { [SERVER_COMMAND]: true },
      })
    }
  }
}
writeFileSync(path.resolve(process.cwd(), STATE_FILE), JSON.stringify(state))

// Retention: entries older than six months (deleted by the retention job) and newer ones (kept).
// The job is queued here so that the test can run it at once instead of waiting for 03:00.
const monthsAgo = (months: number) => {
  const date = new Date()
  date.setUTCMonth(date.getUTCMonth() - months)
  return date.toISOString()
}
const consent = { given: true, at: monthsAgo(7), privacyPolicyVersion: '', text: 'E2E' }
for (const [name, createdAt] of [
  ['E2E Retention alt', monthsAgo(7)],
  ['E2E Retention neu', monthsAgo(5)],
] as const) {
  await payload.create({
    collection: 'contact-messages',
    data: {
      name,
      createdAt,
      email: 'e2e@example.org',
      topic: 'general',
      message: 'E2E',
      locale: 'de',
      status: 'new',
      consent,
    },
  })
}
for (const [lastName, status, decisionDate] of [
  ['E2E Retention abgelehnt alt', 'rejected', monthsAgo(7)],
  ['E2E Retention abgelehnt neu', 'rejected', monthsAgo(5)],
  ['E2E Retention aufgenommen alt', 'accepted', monthsAgo(7)],
] as const) {
  const application = await payload.create({
    collection: 'membership-applications',
    data: {
      firstName: 'E2E',
      lastName,
      email: 'e2e@example.org',
      address: { street: 'E2E 1', postalCode: '00000', city: 'E2E', country: 'E2E' },
      membershipType: 'ordinary',
      declarations: { atLeast16: true, principles: true, fees: true },
      locale: 'de',
      status: 'received',
      consent,
    },
  })
  await payload.update({
    collection: 'membership-applications',
    id: application.id,
    data: { status, decisionDate },
  })
}
await payload.jobs.queue({ task: 'retention', queue: 'maintenance', input: {} })

// CC-2: approved processing purposes for exports (the association decides on the real ones; the
// legal bases of Art. 6(1) GDPR come from the migration), and one draft. CC-1: per worker an
// application in each situation the tests need, plus a member entered by hand.
await payload.updateGlobal({
  slug: 'control-center-settings',
  data: { reminders: { waitingDays: 7, consentDays: 14 } },
})
const basisB = (
  await payload.find({ collection: 'legal-bases', where: { code: { equals: 'b' } }, limit: 1 })
).docs[0]!
const approval = {
  status: 'approved' as const,
  decisionReference: 'E2E Beschluss (Test)',
  approvedOn: new Date().toISOString(),
  approvedByName: 'E2E',
}
await payload.create({
  collection: 'processing-purposes',
  context: { purposeApproval: true },
  data: {
    name: 'E2E Zweck Mitglieder (Test)',
    description: 'E2E',
    dataset: 'members',
    legalBasis: basisB.id,
    justification: 'E2E Begründung für den Test der Exporte.',
    columns: ['firstName', 'lastName', 'email', 'city', 'memberSince'],
    ...approval,
  },
})
await payload.create({
  collection: 'processing-purposes',
  context: { purposeApproval: true },
  data: {
    name: 'E2E Zweck Anträge (Test)',
    dataset: 'applications',
    legalBasis: basisB.id,
    justification: 'E2E Begründung für den Test der Exporte.',
    columns: ['firstName', 'lastName', 'status'],
    ...approval,
  },
})
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
const person = (lastName: string) => ({
  firstName: 'E2E',
  lastName,
  email: 'e2e@example.org',
  address: { street: 'E2E 1', postalCode: '00000', city: 'E2E-Stadt', country: 'E2E' },
  membershipType: 'ordinary' as const,
})
for (let worker = 0; worker < 8; worker++) {
  const base = {
    declarations: { atLeast16: true, principles: true, fees: true },
    locale: 'de' as const,
    status: 'received' as const,
    consent,
  }
  await payload.create({
    collection: 'membership-applications',
    data: { ...person(`Ablauf ${worker}`), ...base },
  })
  await payload.create({
    collection: 'membership-applications',
    data: {
      ...person(`Minderjährig ${worker}`),
      ...base,
      under18: true,
      guardian: { name: 'E2E Elternteil', email: 'eltern@example.org' },
    },
  })
  await payload.create({
    collection: 'membership-applications',
    data: {
      ...person(`Wiedervorlage ${worker}`),
      ...base,
      assignedTo: accountIds.get(`membershipManager-${worker}`),
      followUpOn: yesterday,
    },
  })
  // CC-2: the assignment of an application and of a contact message.
  await payload.create({
    collection: 'membership-applications',
    data: { ...person(`Zuweisung ${worker}`), ...base },
  })
  await payload.create({
    collection: 'contact-messages',
    data: {
      name: `E2E Zuweisung ${worker}`,
      email: 'e2e@example.org',
      topic: 'general',
      message: 'E2E',
      locale: 'de',
      status: 'new',
      consent,
    },
  })
  await payload.create({
    collection: 'members',
    data: { ...person(`Mitglied ${worker}`), memberSince: monthsAgo(24), status: 'active' },
  })
  // CC-2: a membership that ended: due for review at once (the default of 0 days).
  await payload.create({
    collection: 'members',
    data: {
      ...person(`Beendet ${worker}`),
      memberSince: monthsAgo(36),
      status: 'ended',
      endedOn: monthsAgo(1),
    },
  })

  // CC-2: notifications of the auditor of this worker, read and unread, old and recent; the
  // queued retention job deletes read ones after 30 days and unread ones after 90 days.
  const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const auditor = accountIds.get(`auditor-${worker}`)!
  for (const [subjectId, createdAt, readAt] of [
    [`9000${worker}1`, daysAgo(40), daysAgo(31)], // read more than 30 days ago: deleted
    [`9000${worker}2`, daysAgo(40), daysAgo(5)], // read recently: kept
    [`9000${worker}3`, daysAgo(91), null], // unread for more than 90 days: deleted
    [`9000${worker}4`, daysAgo(60), null], // unread for 60 days: kept
  ] as const) {
    await payload.create({
      collection: 'notifications',
      data: {
        recipient: auditor,
        kind: 'exportCreated',
        subjectType: 'exports',
        subjectId,
        href: '/admin/collections/exports',
        readAt,
        createdAt,
      },
    })
  }
}
await payload.jobs.queue({ task: 'membership-reminders', queue: 'maintenance', input: {} })
await payload.jobs.queue({ task: 'notifications-retention', queue: 'maintenance', input: {} })

// Audit retention (12 months): an old entry in the audit log and in the export register, which
// the queued purge removes, while everything newer stays.
await payload.create({
  collection: 'audit-log',
  data: { action: 'e2e.old', area: 'security', result: 'ok', createdAt: monthsAgo(13) },
  context: { [SKIP_AUDIT]: true },
})
await payload.create({
  collection: 'exports',
  data: {
    dataset: 'members',
    rows: 0,
    purpose: 'E2E alter Export',
    legalBasis: 'E2E',
    createdAt: monthsAgo(13),
  },
})
await payload.jobs.queue({ task: 'audit-retention', queue: 'maintenance', input: {} })

// The audit log must refuse changes in the database itself, not only through Payload.
const { drizzle } = payload.db as unknown as PostgresAdapter
const { totalDocs: auditEntries } = await payload.count({ collection: 'audit-log' })
if (auditEntries === 0) {
  console.error('The fixtures should have written audit entries.')
  process.exit(1)
}
for (const statement of [
  sql`update audit_log set action = 'tampered'`,
  sql`delete from audit_log`,
  sql`update exports set purpose = 'tampered'`,
  sql`delete from exports`,
]) {
  const refused = await drizzle.execute(statement).then(
    () => false,
    () => true,
  )
  if (!refused) {
    console.error('The audit log or the export register accepted an UPDATE or DELETE.')
    process.exit(1)
  }
}
// Even with the purge flag, the database deletes nothing younger than the retention period.
const purgeOfRecent = await drizzle
  .transaction(async (tx) => {
    await tx.execute(sql`select set_config('yop.retention_purge', 'on', true)`)
    await tx.execute(sql`select set_config('yop.retention_months', '12', true)`)
    await tx.execute(sql`delete from audit_log where action <> 'e2e.old'`)
  })
  .then(
    () => false,
    () => true,
  )
if (!purgeOfRecent) {
  console.error('The purge flag allowed deleting recent audit entries.')
  process.exit(1)
}

payload.logger.info('E2E fixtures created.')
process.exit(0)
