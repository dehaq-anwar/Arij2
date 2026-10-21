import { createLocalReq, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { startPayload } from './database'

/**
 * The proposal for accepted applications (src/cms/membership/consolidate.ts), run against a real
 * database: the personal data leave the application, nothing else changes, and nothing is lost.
 */
let payload: Payload
let stop: () => Promise<void>
let sql: (query: string, values?: unknown[]) => Promise<Record<string, unknown>[]>

beforeAll(async () => {
  const started = await startPayload('consolidation')
  payload = started.payload
  stop = started.stop
  const { Client } = await import('pg')
  sql = async (query, values) => {
    const client = new Client({ connectionString: started.url })
    await client.connect()
    try {
      return (await client.query(query, values)).rows
    } finally {
      await client.end()
    }
  }
})
afterAll(async () => stop?.())

const consent = {
  given: true,
  at: '2026-10-01T09:00:00.000Z',
  text: 'Ich willige ein (Wortlaut der Einwilligung, Test).',
  version: '2026-10',
}

async function accepted(lastName: string, extra: Record<string, unknown> = {}) {
  const application = await payload.create({
    collection: 'membership-applications',
    data: {
      firstName: 'Erika',
      lastName,
      email: `${lastName.toLowerCase()}@example.test`,
      address: { street: 'Musterweg 1', postalCode: '24103', city: 'Kiel', country: 'Deutschland' },
      membershipType: 'ordinary',
      declarations: { atLeast16: true, principles: true, fees: true },
      locale: 'de',
      status: 'received',
      consent,
      ...extra,
    },
  })
  return payload.update({
    collection: 'membership-applications',
    id: application.id,
    data: { status: 'accepted' },
  })
}

const memberOf = async (application: number) =>
  (
    await payload.find({
      collection: 'members',
      where: { application: { equals: application } },
      depth: 0,
    })
  ).docs[0]!

describe('moving the personal data of accepted applications', () => {
  it('reports first and changes nothing without --apply', async () => {
    const application = await accepted('Bericht')
    const { consolidateAll } = await import('@/cms/membership/consolidate')
    const before = await payload.findByID({
      collection: 'membership-applications',
      id: application.id,
    })
    const results = await consolidateAll(payload, { apply: false })
    expect(results.find((r) => r.application === application.id)).toMatchObject({ action: 'move' })
    const after = await payload.findByID({
      collection: 'membership-applications',
      id: application.id,
    })
    expect(after).toEqual(before)
  })

  it('keeps the proof, the register entry, the history and the audit log; removes the copy', async () => {
    const minor = await accepted('Minderjaehrig', {
      under18: true,
      guardian: {
        name: 'Petra Muster',
        email: 'petra@example.test',
        consentReceivedAt: '2026-10-05T00:00:00.000Z',
      },
    })
    const withNotes = await accepted('Notiz', { internalNotes: 'Bitte vor dem Übertragen lesen.' })
    const memberBefore = await memberOf(minor.id)
    const applicationBefore = await payload.findByID({
      collection: 'membership-applications',
      id: minor.id,
      depth: 0,
    })
    const auditBefore = await sql('select id, action, target_id from audit_log order by id')
    const eventsBefore = await sql(
      'select id, event from case_events where application_id = $1 order by id',
      [minor.id],
    )

    const { consolidateAll, PROOF_FIELDS } = await import('@/cms/membership/consolidate')
    const results = await consolidateAll(payload, { apply: true })
    expect(results.filter((r) => 'error' in r)).toEqual([])
    expect(results.find((r) => r.application === withNotes.id)).toMatchObject({
      action: 'skip',
      reason: 'notes',
    })

    const application = await payload.findByID({
      collection: 'membership-applications',
      id: minor.id,
      depth: 0,
    })
    // The personal data are gone from the application …
    expect(application).toMatchObject({
      firstName: null,
      lastName: null,
      email: null,
      address: { street: null, postalCode: null, city: null, country: null },
      guardian: { name: null, email: null, consentReceivedAt: '2026-10-05T00:00:00.000Z' },
    })
    expect(application.personalDataMovedOn).toBeTruthy()
    // … the proof is exactly as before …
    const pick = (doc: object, path: string) =>
      path.split('.').reduce<unknown>((v, k) => (v as Record<string, unknown> | null)?.[k], doc)
    for (const path of PROOF_FIELDS) {
      expect(pick(application, path), path).toEqual(pick(applicationBefore, path))
    }
    // … the register entry is untouched and still points to the application …
    const member = await memberOf(minor.id)
    expect(member).toEqual(memberBefore)
    expect(member).toMatchObject({
      firstName: 'Erika',
      lastName: 'Minderjaehrig',
      email: 'minderjaehrig@example.test',
    })
    // … the history and the audit log only grew.
    const auditAfter = await sql('select id, action, target_id from audit_log order by id')
    expect(auditAfter.slice(0, auditBefore.length)).toEqual(auditBefore)
    expect(
      auditAfter.some(
        (row) => row.action === 'application.consolidated' && Number(row.target_id) === minor.id,
      ),
    ).toBe(true)
    const eventsAfter = await sql(
      'select id, event from case_events where application_id = $1 order by id',
      [minor.id],
    )
    expect(eventsAfter.slice(0, eventsBefore.length)).toEqual(eventsBefore)
    expect(eventsAfter.at(-1)?.event).toBe('application.moved')

    // The application with notes was left alone.
    const notes = await payload.findByID({
      collection: 'membership-applications',
      id: withNotes.id,
      depth: 0,
    })
    expect(notes).toMatchObject({ lastName: 'Notiz', personalDataMovedOn: null })

    // A second run finds nothing more to do.
    const again = await consolidateAll(payload, { apply: true })
    expect(again.find((r) => r.application === minor.id)).toBeUndefined()
  })

  it('does not let the data come back, and the database refuses empty fields otherwise', async () => {
    const application = await accepted('Zurueck')
    const { consolidateAll } = await import('@/cms/membership/consolidate')
    await consolidateAll(payload, { apply: true })
    await payload.update({
      collection: 'membership-applications',
      id: application.id,
      data: { firstName: 'Wieder', email: 'wieder@example.test', internalNotes: 'x' },
    })
    expect(
      await payload.findByID({
        collection: 'membership-applications',
        id: application.id,
        depth: 0,
      }),
    ).toMatchObject({ firstName: null, email: null, internalNotes: 'x' })

    const open = await payload.create({
      collection: 'membership-applications',
      data: {
        firstName: 'Offen',
        lastName: 'Antrag',
        email: 'offen@example.test',
        address: { street: 'Weg 1', postalCode: '1', city: 'K', country: 'D' },
        membershipType: 'ordinary',
        declarations: { atLeast16: true, principles: true, fees: true },
        locale: 'de',
        status: 'received',
        consent,
      },
    })
    await expect(
      sql('update membership_applications set email = null where id = $1', [open.id]),
    ).rejects.toThrow(/membership_applications_person_present/)
    const member = await memberOf(application.id)
    await expect(sql('update members set email = null where id = $1', [member.id])).rejects.toThrow(
      /members_contact_present/,
    )
  })

  it('runs in a transaction: a rollback leaves the application as it was', async () => {
    const application = await accepted('Rollback')
    const before = await payload.findByID({
      collection: 'membership-applications',
      id: application.id,
      depth: 0,
    })
    const { consolidateApplication } = await import('@/cms/membership/consolidate')
    const req = await createLocalReq({}, payload)
    const transaction = await payload.db.beginTransaction()
    req.transactionID = transaction!
    await consolidateApplication(payload, application.id, { apply: true, req })
    await payload.db.rollbackTransaction(transaction!)
    const after = await payload.findByID({
      collection: 'membership-applications',
      id: application.id,
      depth: 0,
    })
    expect(after).toEqual(before)
  })
})
