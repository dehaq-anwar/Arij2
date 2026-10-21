import { createLocalReq, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { startPayload } from './database'

/**
 * The titles of applications and register entries (CC-2): the migration fills them for existing
 * entries exactly as the hooks compute them, and no name stays in an application whose personal
 * data were moved to the register.
 */
let payload: Payload
let stop: () => Promise<void>

beforeAll(async () => {
  const started = await startPayload('titles')
  payload = started.payload
  stop = started.stop
})
afterAll(async () => stop?.())

const consent = {
  given: true,
  at: '2026-10-01T09:00:00.000Z',
  text: 'Ich willige ein (Wortlaut der Einwilligung, Test).',
  version: '2026-10',
}

const apply = (lastName: string, firstName = 'Erika') =>
  payload.create({
    collection: 'membership-applications',
    data: {
      firstName,
      lastName,
      email: 'titel@example.test',
      address: { street: 'Musterweg 1', postalCode: '24103', city: 'Kiel', country: 'Deutschland' },
      membershipType: 'ordinary',
      declarations: { atLeast16: true, principles: true, fees: true },
      locale: 'de',
      status: 'received',
      consent,
    },
  })

type Titled = { id: number; display_title: string | null }
const titles = async (table: 'membership_applications' | 'members') => {
  const { rows } = (await (
    payload.db as unknown as { drizzle: { execute: (q: string) => Promise<{ rows: Titled[] }> } }
  ).drizzle.execute(`select id, display_title from ${table} order by id`)) as { rows: Titled[] }
  return rows
}

describe('titles of applications and register entries', () => {
  it('are "Last name, first name", and only the number once the data were moved', async () => {
    const open = await apply('Offen')
    expect(open.displayTitle).toBe('Offen, Erika')
    const moved = await apply('Umzug', 'Max')
    await payload.update({
      collection: 'membership-applications',
      id: moved.id,
      data: { status: 'accepted' },
    })
    const { consolidateApplication } = await import('@/cms/membership/consolidate')
    await consolidateApplication(payload, moved.id, {
      apply: true,
      req: await createLocalReq({}, payload),
    })
    const after = await payload.findByID({ collection: 'membership-applications', id: moved.id })
    expect(after.displayTitle).toBe(`#${moved.id}`)
    expect(JSON.stringify(after)).not.toContain('Umzug')

    const member = (
      await payload.find({
        collection: 'members',
        where: { application: { equals: moved.id } },
        depth: 0,
      })
    ).docs[0]!
    expect(member.displayTitle).toBe('Umzug, Max')
    const renamed = await payload.update({
      collection: 'members',
      id: member.id,
      data: { lastName: 'Neu' },
    })
    expect(renamed.displayTitle).toBe('Neu, Max')
  })

  it('are filled by the migration exactly as the hooks compute them', async () => {
    const before = { applications: await titles('membership_applications') }
    const membersBefore = await titles('members')
    expect(before.applications.length).toBeGreaterThan(1)
    expect(membersBefore.length).toBeGreaterThan(0)

    const { migrations } = await import('@/migrations')
    const migration = migrations.find((m) => m.name.endsWith('_cc2_display_titles'))!
    const db = (payload.db as unknown as { drizzle: unknown }).drizzle
    const req = await createLocalReq({}, payload)
    await migration.down({ db, payload, req } as never)
    await migration.up({ db, payload, req } as never)

    expect(await titles('membership_applications')).toEqual(before.applications)
    expect(await titles('members')).toEqual(membersBefore)
  })
})
