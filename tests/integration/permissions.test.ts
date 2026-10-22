import { createLocalReq, type CollectionSlug, type Payload, type PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ROLES, type Role } from '@/cms/access/permissions'

import { startPayload } from './database'

/**
 * The permission matrix (docs/CONTROL-CENTER.md §4, §15 and §16), checked against every
 * collection and global of the running configuration, for every role and for visitors. The
 * expectations are written down here from the documented table, not derived from the code under
 * test; a collection or global that is added without an entry here fails the test.
 *
 *   all  — the access rule allows every document
 *   some — only some documents (a query: published only, one's own, certain areas, …)
 *   none — refused
 *
 * The person counts as signed in with both factors (the session check reads the request's
 * cache); sign-in itself, pending sessions and expired codes are tested end to end.
 */
type Who = Role | 'visitor'
type Level = 'all' | 'some' | 'none'
type Row = Record<Who, Level>
type Operation = 'read' | 'readVersions' | 'create' | 'update' | 'delete' | 'admin'

const EVERYONE: Who[] = ['visitor', ...ROLES]
const CONTENT_READERS: Who[] = ['superAdmin', 'boardAdmin', 'contentEditor', 'auditor']
const CONTENT_WRITERS: Who[] = ['superAdmin', 'contentEditor']
const INBOX: Who[] = ['superAdmin', 'boardAdmin', 'membershipManager']
const OPERATIONS_READERS: Who[] = ['superAdmin', 'boardAdmin', 'technicalAdmin', 'auditor']
const EMAIL: Who[] = ['superAdmin', 'technicalAdmin']
const EXPORT_SETTINGS_READERS: Who[] = ['superAdmin', 'boardAdmin', 'membershipManager', 'auditor']

/** `all` for some, `some` for others, `none` for everyone else. */
function grant(all: Who[], some: Who[] = []): Row {
  return Object.fromEntries(
    EVERYONE.map((who) => [who, all.includes(who) ? 'all' : some.includes(who) ? 'some' : 'none']),
  ) as Row
}
const others = (...listed: Who[][]) => EVERYONE.filter((who) => !listed.flat().includes(who))
const NONE = grant([])
const SIGNED_IN = ROLES as unknown as Who[]

/** Content visitors may see in part (published, or with consent), editors in full. */
const publicContent = {
  read: grant(CONTENT_READERS, others(CONTENT_READERS)),
  create: grant(CONTENT_WRITERS),
  update: grant(CONTENT_WRITERS),
  delete: grant(CONTENT_WRITERS),
}
/** With drafts and versions: earlier versions only for those who see content in full. */
const versionedContent = { ...publicContent, readVersions: grant(CONTENT_READERS) }
const openContent = { ...publicContent, read: grant(EVERYONE) }
const closed = { read: NONE, create: NONE, update: NONE, delete: NONE }
const readOnly = (row: Row) => ({ ...closed, read: row })

const COLLECTIONS: Record<string, Partial<Record<Operation, Row>>> = {
  pages: versionedContent,
  projects: versionedContent,
  news: versionedContent,
  events: versionedContent,
  partners: publicContent,
  'team-members': publicContent,
  'focus-areas': openContent,
  media: openContent,
  statistics: openContent,
  redirects: { ...publicContent, read: grant(CONTENT_READERS) },

  'membership-applications': {
    read: grant(INBOX),
    create: NONE, // only the website's form, through the server
    update: grant(INBOX),
    delete: grant(['superAdmin']),
  },
  'contact-messages': {
    read: grant(INBOX),
    create: NONE,
    update: grant(INBOX),
    delete: grant(INBOX),
  },
  members: {
    read: grant(INBOX),
    create: grant(INBOX),
    update: grant(INBOX),
    delete: grant(['superAdmin']),
  },
  'case-events': readOnly(grant(INBOX)),
  // Everyone who exports sees their own exports; oversight sees all.
  exports: readOnly(grant(['superAdmin', 'boardAdmin', 'auditor'], ['membershipManager'])),
  'legal-bases': {
    read: grant(EXPORT_SETTINGS_READERS),
    create: NONE,
    update: grant(['superAdmin']),
    delete: NONE,
  },
  'processing-purposes': {
    read: grant(EXPORT_SETTINGS_READERS),
    create: grant(['superAdmin']),
    update: grant(['superAdmin']),
    delete: grant([], ['superAdmin']), // drafts only
  },
  notifications: readOnly(grant([], SIGNED_IN)),

  users: {
    admin: grant(SIGNED_IN),
    read: grant(
      ['superAdmin', 'boardAdmin', 'auditor'],
      others(['visitor'], ['superAdmin', 'boardAdmin', 'auditor']),
    ),
    create: grant(['superAdmin', 'boardAdmin']),
    update: grant(['superAdmin'], others(['visitor', 'superAdmin'])),
    delete: grant(['superAdmin']),
  },
  'audit-log': readOnly(grant(['superAdmin', 'auditor'], ['boardAdmin', 'technicalAdmin'])),
  'auth-sessions': closed,
  'auth-mfa': closed,
  'trusted-devices': closed,
  'rate-limit-buckets': closed,

  'ops-samples': readOnly(grant(OPERATIONS_READERS)),
  'ops-events': readOnly(grant(OPERATIONS_READERS)),
  'email-log': readOnly(grant(EMAIL)),
  'access-stats': readOnly(grant(OPERATIONS_READERS)),

  // Payload's own collections.
  'payload-jobs': closed,
  'payload-kv': closed,
  // Who is editing which document right now (ids only), for everyone signed in.
  'payload-locked-documents': {
    read: grant(SIGNED_IN),
    create: grant(SIGNED_IN),
    update: grant(SIGNED_IN),
    delete: grant(SIGNED_IN),
  },
}

/** Payload's own collections with fixed rules of their own. */
const NOT_IN_MATRIX: Record<string, string> = {
  'payload-preferences': "Payload's per-person preferences: each person only their own",
  'payload-migrations': 'no API at all (checked below)',
}

const contentGlobal = {
  read: grant(EVERYONE),
  readVersions: grant(CONTENT_READERS),
  update: grant(CONTENT_WRITERS),
}
const formerPage = { read: grant(EVERYONE), update: NONE } // kept for the first start only

const GLOBALS: Record<string, { read: Row; update: Row; readVersions?: Row }> = {
  'home-page': formerPage,
  'about-page': formerPage,
  'membership-page': formerPage,
  'support-page': formerPage,
  'contact-page': formerPage,
  navigation: contentGlobal,
  'form-texts': contentGlobal,
  'legal-notice': contentGlobal,
  'privacy-policy': contentGlobal,
  'site-settings': contentGlobal,
  'control-center-settings': { read: grant(['superAdmin']), update: grant(['superAdmin']) },
  'email-settings': { read: grant(EMAIL), update: grant(EMAIL) },
  'operations-state': { read: grant(OPERATIONS_READERS), update: NONE },
  'payload-jobs-stats': { read: NONE, update: NONE },
}

let payload: Payload
let stop: () => Promise<void>
const requests = new Map<Who, PayloadRequest>()

beforeAll(async () => {
  ;({ payload, stop } = await startPayload('permissions'))
  for (const [index, who] of EVERYONE.entries()) {
    if (who === 'visitor') {
      requests.set(who, await createLocalReq({}, payload))
      continue
    }
    const sid = `matrix-${who}`
    const user = { id: index, _sid: sid, collection: 'users', role: who, restrictions: [] }
    const record = {
      id: index,
      sid,
      user: index,
      status: 'active',
      createdAt: new Date().toISOString(),
    }
    requests.set(
      who,
      await createLocalReq(
        { user: user as never, context: { 'yop.currentSession': { sid, record } } },
        payload,
      ),
    )
  }
}, 120_000)

afterAll(async () => {
  await stop?.()
})

async function level(rule: unknown, req: PayloadRequest): Promise<Level> {
  // No rule (possible for versions): Payload then lets in anyone signed in.
  if (rule === undefined) return req.user ? 'all' : 'none'
  if (typeof rule !== 'function') return 'none'
  const result = await rule({ req, data: {} })
  if (result === true) return 'all'
  if (result && typeof result === 'object') return 'some'
  return 'none'
}

async function actual(rules: Record<string, unknown>, operations: string[]) {
  const table: Record<string, Row> = {}
  for (const operation of operations) {
    const row = {} as Row
    for (const who of EVERYONE) row[who] = await level(rules[operation], requests.get(who)!)
    table[operation] = row
  }
  return table
}

describe('permission matrix', () => {
  it('every collection and global has an entry', () => {
    const collections = payload.config.collections.map((c) => c.slug)
    const missing = collections.filter((slug) => !(slug in COLLECTIONS) && !(slug in NOT_IN_MATRIX))
    expect(missing).toEqual([])
    expect(
      Object.keys(COLLECTIONS).filter((slug) => !collections.includes(slug as CollectionSlug)),
    ).toEqual([])
    const globals = payload.config.globals.map((g) => g.slug)
    expect(globals.filter((slug) => !(slug in GLOBALS))).toEqual([])
    expect(Object.keys(GLOBALS).filter((slug) => !(globals as string[]).includes(slug))).toEqual([])
  })

  it('everything with versions has an entry for reading them', () => {
    const versioned = [
      ...payload.config.collections
        .filter((c) => c.versions && !('readVersions' in (COLLECTIONS[c.slug] ?? {})))
        .map((c) => c.slug),
      ...payload.config.globals
        .filter((g) => g.versions && !('readVersions' in (GLOBALS[g.slug] ?? {})))
        .map((g) => g.slug),
    ]
    expect(versioned).toEqual([])
  })

  for (const [slug, expected] of Object.entries(COLLECTIONS)) {
    it(`collection ${slug}`, async () => {
      const config = payload.collections[slug as CollectionSlug]!.config
      const table = await actual(config.access as Record<string, unknown>, Object.keys(expected))
      expect(table).toEqual(expected)
    })
  }

  for (const [slug, expected] of Object.entries(GLOBALS)) {
    it(`global ${slug}`, async () => {
      const config = payload.config.globals.find((g) => g.slug === slug)!
      const table = await actual(config.access as Record<string, unknown>, Object.keys(expected))
      expect(table).toEqual(expected)
    })
  }

  it("Payload's migrations have no API", () => {
    expect(payload.collections['payload-migrations']!.config.endpoints).toBe(false)
  })

  it('restrictions take permissions away from a role', async () => {
    const sid = 'matrix-restricted'
    const user = {
      id: 99,
      _sid: sid,
      collection: 'users',
      role: 'boardAdmin',
      restrictions: ['members.read', 'members.write'],
    }
    const record = { id: 99, sid, user: 99, status: 'active', createdAt: new Date().toISOString() }
    const req = await createLocalReq(
      { user: user as never, context: { 'yop.currentSession': { sid, record } } },
      payload,
    )
    const members = payload.collections.members!.config.access
    expect(await level(members.read, req)).toBe('none')
    expect(await level(members.update, req)).toBe('none')
    expect(
      await level(payload.collections['membership-applications']!.config.access.read, req),
    ).toBe('all')
  })

  it('without a session confirmed with the second factor, a role counts for nothing', async () => {
    const user = { id: 1, _sid: 'unconfirmed', collection: 'users', role: 'superAdmin' }
    const req = await createLocalReq({ user: user as never }, payload)
    for (const slug of ['members', 'membership-applications', 'audit-log', 'email-log', 'pages']) {
      const access = payload.collections[slug as CollectionSlug]!.config.access
      expect(await level(access.update, req), slug).toBe('none')
    }
    expect(await level(payload.collections.members!.config.access.read, req)).toBe('none')
  })
})
