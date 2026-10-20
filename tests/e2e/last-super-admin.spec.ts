import type { APIRequestContext } from '@playwright/test'
import { Client } from 'pg'

import { authHeaders, confirmStepUp, signedInToken } from './auth'
import { account, adminUrl, freshAddress } from './fixtures'
import type { AccountName } from './secrets'
import { expect, test } from './test'

/**
 * "At least one active super administrator remains", also when two changes happen at the same
 * moment. This project runs alone after all other tests (playwright.config.ts): it disables the
 * super administrators of every other worker, so that exactly two remain.
 */
test.describe.configure({ mode: 'serial', timeout: 180_000 })

const connect = async () => {
  const client = new Client({ connectionString: process.env.E2E_DATABASE_URL })
  await client.connect()
  return client
}

let db: Client
const A: AccountName = 'superAdmin'
const B: AccountName = 'spareAdmin'
const ids: Record<string, number> = {}

const activeSuperAdmins = async () =>
  Number(
    (
      await db.query(
        `select count(*) from users where role = 'superAdmin' and coalesce(disabled, false) = false`,
      )
    ).rows[0].count,
  )

/** Both accounts active super administrators again (raising is never refused). */
async function restore(request: APIRequestContext) {
  await db.query(`update users set role = 'superAdmin', disabled = false where id = any($1)`, [
    [ids[A], ids[B]],
  ])
  for (const name of [A, B]) await signedInToken(request, name, true)
}

const patch = async (request: APIRequestContext, actor: AccountName, id: number, data: object) =>
  (
    await request.patch(adminUrl(`/api/users/${id}`), {
      headers: { ...(await authHeaders(request, actor)), 'X-Forwarded-For': freshAddress() },
      data,
    })
  ).status()

test.beforeAll(async () => {
  db = await connect()
  for (const name of [A, B]) {
    const { rows } = await db.query('select id from users where email = $1', [
      account(name).email.toLowerCase(),
    ])
    ids[name] = rows[0].id
  }
  await db.query(
    `update users set disabled = true where role = 'superAdmin' and not (id = any($1))`,
    [[ids[A], ids[B]]],
  )
  expect(await activeSuperAdmins()).toBe(2)
})

test.afterAll(async () => {
  await db?.end()
})

for (const [label, data] of [
  ['demoting', { role: 'boardAdmin' }],
  ['deactivating', { disabled: true }],
] as const) {
  test(`two super administrators ${label} each other at the same moment: one is refused`, async ({
    request,
  }) => {
    await restore(request)
    await confirmStepUp(request, A)
    await confirmStepUp(request, B)
    const results = await Promise.all([
      patch(request, A, ids[B]!, data),
      patch(request, B, ids[A]!, data),
    ])
    expect(results.sort()).toEqual([200, 400])
    expect(await activeSuperAdmins()).toBe(1)
  })
}

test('the database refuses it too, also for two connections at the same moment', async ({
  request,
}) => {
  await restore(request)
  const other = await connect()
  try {
    await db.query('begin')
    await other.query('begin')
    await db.query(`update users set role = 'boardAdmin' where id = $1`, [ids[A]])
    // Waits for the first transaction (same lock), then sees its result and refuses.
    const second = other.query(`update users set disabled = true where id = $1`, [ids[B]]).then(
      () => 'accepted',
      (error: Error) => error.message,
    )
    await new Promise((resolve) => setTimeout(resolve, 500))
    await db.query('commit')
    expect(await second).toContain('at least one active super administrator must remain')
    await other.query('rollback')
  } finally {
    await other.end()
  }
  expect(await activeSuperAdmins()).toBe(1)
  // The last one can be neither demoted, deactivated nor deleted.
  for (const statement of [
    `update users set role = 'auditor' where id = $1`,
    `update users set disabled = true where id = $1`,
    `delete from users where id = $1`,
  ]) {
    const refused = await db.query(statement, [ids[B]]).then(
      () => false,
      () => true,
    )
    expect(refused, statement).toBe(true)
  }
})

test('two super administrators deleting each other at the same moment: one is refused', async ({
  request,
}) => {
  await restore(request)
  await confirmStepUp(request, A)
  await confirmStepUp(request, B)
  const remove = async (actor: AccountName, id: number) =>
    (
      await request.delete(adminUrl(`/api/users/${id}`), {
        headers: { ...(await authHeaders(request, actor)), 'X-Forwarded-For': freshAddress() },
      })
    ).status()
  const results = await Promise.all([remove(A, ids[B]!), remove(B, ids[A]!)])
  expect(results.sort()).toEqual([200, 400])
  expect(await activeSuperAdmins()).toBe(1)
})
