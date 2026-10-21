import AxeBuilder from '@axe-core/playwright'
import type { APIRequestContext } from '@playwright/test'

import { authHeaders, confirmStepUp, signedInToken, signInBrowser } from './auth'
import { adminUrl, freshAddress } from './fixtures'
import type { AccountName } from './secrets'
import { expect, test } from './test'

test.use({ locale: 'de-DE' })
// Steps that need a fresh code wait for the next 30-second step.
test.describe.configure({ timeout: 90_000 })

const worker = () => test.info().parallelIndex

type Doc = Record<string, unknown> & { id: number }

async function api(
  request: APIRequestContext,
  name: AccountName,
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  data?: unknown,
) {
  const headers = { ...(await authHeaders(request, name)), 'X-Forwarded-For': freshAddress() }
  const response = await request[method](adminUrl(path), { headers, data })
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null
  return { status: response.status(), body }
}

async function application(request: APIRequestContext, lastName: string): Promise<Doc> {
  const { body } = await api(
    request,
    'boardAdmin',
    'get',
    `/api/membership-applications?where[lastName][equals]=${encodeURIComponent(lastName)}&depth=0`,
  )
  const doc = (body?.docs as Doc[] | undefined)?.[0]
  expect(doc, lastName).toBeTruthy()
  return doc!
}

async function events(request: APIRequestContext, where: string) {
  const { body } = await api(
    request,
    'superAdmin',
    'get',
    `/api/case-events?${where}&sort=createdAt&limit=50&depth=0`,
  )
  return (body?.docs as { event: string; from?: string; to?: string; actorName?: string }[]) ?? []
}

async function feed(request: APIRequestContext, name: AccountName) {
  const { body } = await api(request, name, 'get', '/api/notifications/feed?limit=50')
  return body as {
    unread: number
    items: { id: number; kind: string; subjectId: string | null; read: boolean }[]
  }
}

test.describe('applications', () => {
  test('from received to review to accepted: history, register entry, then locked', async ({
    request,
  }) => {
    const app = await application(request, `Ablauf ${worker()}`)
    const mm = 'membershipManager'
    expect(
      (
        await api(request, mm, 'patch', `/api/membership-applications/${app.id}`, {
          status: 'inReview',
        })
      ).status,
    ).toBe(200)
    const me = await api(request, mm, 'get', '/api/users/me')
    const myId = (me.body?.user as { id: number }).id
    const followUp = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(
      (
        await api(request, mm, 'patch', `/api/membership-applications/${app.id}`, {
          assignedTo: myId,
          followUpOn: followUp,
        })
      ).status,
    ).toBe(200)
    const accepted = await api(request, mm, 'patch', `/api/membership-applications/${app.id}`, {
      status: 'accepted',
    })
    expect(accepted.status).toBe(200)
    expect((accepted.body?.doc as Doc).decisionDate).toBeTruthy()

    // The register entry exists, with the application's fields only and its source.
    const members = await api(
      request,
      mm,
      'get',
      `/api/members?where[application][equals]=${app.id}&depth=0`,
    )
    const member = (members.body?.docs as Doc[])[0]!
    expect(member).toMatchObject({
      firstName: 'E2E',
      lastName: `Ablauf ${worker()}`,
      email: 'e2e@example.org',
      membershipType: 'ordinary',
      status: 'active',
      source: 'application',
      minorAtAdmission: false,
    })
    expect(Object.keys(member).sort()).toEqual(
      [
        'id',
        'firstName',
        'lastName',
        'email',
        'address',
        'membershipType',
        'minorAtAdmission',
        'guardian',
        'status',
        'memberSince',
        'endedOn',
        'source',
        'application',
        'updatedAt',
        'createdAt',
        // The review after the end of a membership (CC-2): empty while the membership lasts.
        'reviewDueOn',
        'reviewOutcome',
        'retainUntil',
        'retentionReason',
        'retentionNote',
        'reviewedOn',
        'reviewedByName',
        'contactDataRemovedOn',
        // The title in the edit screen (CC-2), from the name.
        'displayTitle',
      ].sort(),
    )
    expect(member).toMatchObject({
      displayTitle: `Ablauf ${worker()}, E2E`,
      reviewDueOn: null,
      reviewOutcome: null,
      retainUntil: null,
      contactDataRemovedOn: null,
    })

    const history = await events(request, `where[application][equals]=${app.id}`)
    expect(history.map((e) => e.event)).toEqual([
      'application.received',
      'application.status',
      'application.assigned',
      'application.followUp',
      'application.status',
      'member.created',
    ])
    expect(history[1]).toMatchObject({
      from: 'received',
      to: 'inReview',
      actorName: 'E2E Mitgliederverwaltung',
    })
    expect(history[4]).toMatchObject({ from: 'inReview', to: 'accepted' })

    // Once the person is in the register, the decision is final here.
    const reverted = await api(request, mm, 'patch', `/api/membership-applications/${app.id}`, {
      status: 'rejected',
    })
    expect(reverted.status).toBe(400)
    expect(JSON.stringify(reverted.body)).toContain('Mitgliederverzeichnis')
  })

  test('under 18: stays "consent pending" and cannot be accepted until the date is recorded', async ({
    request,
  }) => {
    const app = await application(request, `Minderjährig ${worker()}`)
    const pending = await api(
      request,
      'boardAdmin',
      'get',
      `/api/membership-applications?where[and][0][status][in]=received,inReview&where[and][1][under18][equals]=true&where[and][2][guardian.consentReceivedAt][exists]=false&where[and][3][id][equals]=${app.id}&depth=0`,
    )
    expect(pending.body?.totalDocs).toBe(1)
    expect(
      (
        await api(request, 'boardAdmin', 'patch', `/api/membership-applications/${app.id}`, {
          status: 'accepted',
        })
      ).status,
    ).toBe(400)
    const accepted = await api(
      request,
      'boardAdmin',
      'patch',
      `/api/membership-applications/${app.id}`,
      {
        status: 'accepted',
        guardian: {
          name: 'E2E Elternteil',
          email: 'eltern@example.org',
          consentReceivedAt: '2026-10-20T10:00:00.000Z',
        },
      },
    )
    expect(accepted.status).toBe(200)
    const members = await api(
      request,
      'boardAdmin',
      'get',
      `/api/members?where[application][equals]=${app.id}&depth=0`,
    )
    expect((members.body?.docs as Doc[])[0]).toMatchObject({
      minorAtAdmission: true,
      guardian: { name: 'E2E Elternteil', email: 'eltern@example.org' },
    })
  })

  test('the list: stage tabs with counts, search and filters, cards on a phone', async ({
    page,
    request,
  }) => {
    await signInBrowser(page.context(), request, 'boardAdmin')
    await page.goto(adminUrl('/admin/collections/membership-applications?stage=all'))
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Mitgliedsanträge')
    const tabs = page.getByRole('navigation', { name: 'Stand' })
    await expect(tabs.getByRole('link', { name: /Zustimmung ausstehend/ })).toBeVisible()
    await page.getByLabel('Suche').fill(`Wiedervorlage ${worker()}`)
    await page.getByRole('button', { name: 'Anwenden' }).click()
    await expect(page).toHaveURL(/q=Wiedervorlage/)
    const rows = page.locator('table.yop-records tbody tr')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText(`Wiedervorlage ${worker()}`)
    await expect(rows.first()).toContainText('E2E Mitgliederverwaltung')
    await expect(rows.first().locator('.yop-due')).toBeVisible()

    await page.goto(
      adminUrl(
        `/admin/collections/membership-applications?stage=open&followUp=due&q=Wiedervorlage+${worker()}`,
      ),
    )
    await expect(rows).toHaveCount(1)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await expect(rows.first().locator('td').first()).toHaveCSS('display', 'flex')
    // The cards span the screen (minus the page margins), so their values have room.
    expect((await page.locator('.yop-records').boundingBox())!.width).toBeGreaterThan(340)
  })
})

test.describe('assignment', () => {
  test('whoever works on the inbox assigns a colleague; only people with access can be assigned', async ({
    page,
    request,
  }) => {
    const ids = {} as Record<AccountName, number>
    const roles = [
      'superAdmin',
      'boardAdmin',
      'membershipManager',
      'contentEditor',
      'technicalAdmin',
      'auditor',
    ] as const
    for (const name of roles) {
      ids[name] = ((await api(request, name, 'get', '/api/users/me')).body?.user as Doc).id
    }

    // The menu: id and name only, of everyone who can read and work on the inbox.
    for (const collection of ['membership-applications', 'contact-messages']) {
      const list = await api(request, 'membershipManager', 'get', `/api/${collection}/assignees`)
      expect(list.status).toBe(200)
      const people = list.body?.people as { id: number; name: string }[]
      const listed = new Set(people.map((person) => person.id))
      for (const name of ['superAdmin', 'boardAdmin', 'membershipManager'] as const) {
        expect(listed.has(ids[name]), `${collection} ${name}`).toBe(true)
      }
      for (const name of ['contentEditor', 'technicalAdmin', 'auditor'] as const) {
        expect(listed.has(ids[name]), `${collection} ${name}`).toBe(false)
      }
      expect(people.every((person) => Object.keys(person).sort().join() === 'id,name')).toBe(true)
      for (const name of ['contentEditor', 'technicalAdmin', 'auditor'] as const) {
        expect(
          (await api(request, name, 'get', `/api/${collection}/assignees`)).status,
          `${collection} ${name}`,
        ).toBe(403)
      }
    }
    // The membership manager may not read the accounts …
    const accounts = await api(request, 'membershipManager', 'get', '/api/users?limit=100')
    expect(accounts.body?.totalDocs).toBe(1)

    // … and still assigns an application to the board, but not to people without inbox access.
    const app = await application(request, `Zuweisung ${worker()}`)
    const assign = (collection: string, id: number, to: number) =>
      api(request, 'membershipManager', 'patch', `/api/${collection}/${id}`, { assignedTo: to })
    expect((await assign('membership-applications', app.id, ids.boardAdmin)).status).toBe(200)
    for (const name of ['contentEditor', 'technicalAdmin', 'auditor'] as const) {
      const refused = await assign('membership-applications', app.id, ids[name])
      expect(refused.status, name).toBe(400)
      // The API names the field; the edit screen shows the full reason under it.
      expect(JSON.stringify(refused.body), name).toContain('Zuständig')
    }
    expect((await application(request, `Zuweisung ${worker()}`)).assignedTo).toBe(ids.boardAdmin)
    const history = await events(request, `where[application][equals]=${app.id}`)
    expect(history.filter((e) => e.event === 'application.assigned').map((e) => e.to)).toEqual([
      'E2E Vorstand',
    ])

    // The same for a contact message; the person assigned is told.
    const found = await api(
      request,
      'boardAdmin',
      'get',
      `/api/contact-messages?where[name][equals]=${encodeURIComponent(`E2E Zuweisung ${worker()}`)}&depth=0`,
    )
    const message = (found.body?.docs as Doc[])[0]!
    expect((await assign('contact-messages', message.id, ids.contentEditor)).status).toBe(400)
    expect((await assign('contact-messages', message.id, ids.boardAdmin)).status).toBe(200)
    const notices = (await feed(request, 'boardAdmin')).items as {
      kind: string
      subjectType?: string
      subjectId: string | null
    }[]
    for (const [subjectType, id] of [
      ['membership-applications', app.id],
      ['contact-messages', message.id],
    ] as const) {
      expect(
        notices.some(
          (n) =>
            n.kind === 'assigned' && n.subjectType === subjectType && n.subjectId === String(id),
        ),
        subjectType,
      ).toBe(true)
    }

    // In the Control Center: the name in the list and in the menu, for someone without users.read.
    await signInBrowser(page.context(), request, 'membershipManager')
    await page.goto(
      adminUrl(
        `/admin/collections/contact-messages?where[name][equals]=${encodeURIComponent(`E2E Zuweisung ${worker()}`)}`,
      ),
    )
    await expect(page.locator('.cell-assignedTo').last()).toHaveText('E2E Vorstand')
    await page.goto(adminUrl(`/admin/collections/contact-messages/${message.id}`))
    const field = page.locator('.field-type').filter({ hasText: 'Zuständig' })
    await expect(field).toContainText('E2E Vorstand')
    await field.locator('.rs__control').click()
    await expect(
      page.getByRole('option', { name: 'E2E Mitgliederverwaltung' }).first(),
    ).toBeVisible()
    await expect(page.getByRole('option', { name: 'E2E Redaktion' })).toHaveCount(0)
  })
})

test.describe('members register', () => {
  test('entered by hand, ended, and deleted only by a super administrator with a code', async ({
    request,
  }) => {
    const created = await api(request, 'membershipManager', 'post', '/api/members', {
      firstName: 'E2E',
      lastName: `Hand ${worker()}`,
      email: 'hand@example.org',
      address: { street: 'E2E 2', postalCode: '00000', city: 'E2E', country: 'E2E' },
      membershipType: 'supporting',
      memberSince: '2020-05-01T12:00:00.000Z',
      // Not settable from outside: the server decides where an entry came from.
      source: 'application',
      application: 1,
    })
    expect(created.status).toBe(201)
    const member = created.body?.doc as Doc
    expect(member).toMatchObject({ source: 'manual', application: null, status: 'active' })

    const ended = await api(request, 'membershipManager', 'patch', `/api/members/${member.id}`, {
      status: 'ended',
    })
    expect(ended.status).toBe(200)
    expect((ended.body?.doc as Doc).endedOn).toBeTruthy()
    const history = await events(request, `where[member][equals]=${member.id}`)
    expect(history.map((e) => e.event)).toEqual(['member.created', 'member.ended'])

    for (const name of ['membershipManager', 'boardAdmin'] as const) {
      expect((await api(request, name, 'delete', `/api/members/${member.id}`)).status, name).toBe(
        403,
      )
    }
    // A new session: one this worker used before may still hold a recent code confirmation.
    await signedInToken(request, 'superAdmin', true)
    const withoutCode = await api(request, 'superAdmin', 'delete', `/api/members/${member.id}`)
    expect(withoutCode.status).toBe(403)
    expect(JSON.stringify(withoutCode.body).toLowerCase()).toContain('authenticator')
    await confirmStepUp(request, 'superAdmin')
    expect((await api(request, 'superAdmin', 'delete', `/api/members/${member.id}`)).status).toBe(
      200,
    )
    expect(await events(request, `where[member][equals]=${member.id}`)).toEqual([])
  })

  test('after the end: review due; keep until a date for a reason; removing data needs a code', async ({
    request,
  }) => {
    const created = await api(request, 'membershipManager', 'post', '/api/members', {
      firstName: 'E2E',
      lastName: `Prüfung ${worker()}`,
      email: 'pruefung@example.org',
      address: { street: 'E2E 4', postalCode: '00000', city: 'E2E', country: 'E2E' },
      membershipType: 'ordinary',
      memberSince: '2019-05-01T12:00:00.000Z',
    })
    const member = created.body?.doc as Doc
    const path = `/api/members/${member.id}`
    const review = (data: Record<string, unknown>, name: AccountName = 'membershipManager') =>
      api(request, name, 'post', `${path}/review`, data)
    const nextYear = `${new Date().getFullYear() + 1}-12-31`
    expect((await review({ keep: 'all', until: nextYear, reason: 'proof' })).body).toEqual({
      error: 'not_ended',
    })

    // Ending the membership makes it due for review (0 days by default); nothing is deleted.
    await api(request, 'membershipManager', 'patch', path, { status: 'ended' })
    const ended = (await api(request, 'membershipManager', 'get', `${path}?depth=0`)).body as Doc
    expect(ended).toMatchObject({
      status: 'ended',
      reviewOutcome: 'pending',
      email: 'pruefung@example.org',
    })
    expect(new Date(String(ended.reviewDueOn)).getTime()).toBeLessThanOrEqual(Date.now())
    const due = await api(
      request,
      'membershipManager',
      'get',
      `/api/members?where[status][equals]=ended&where[reviewDueOn][less_than_equal]=${new Date().toISOString()}&limit=200&depth=0`,
    )
    expect((due.body?.docs as Doc[]).map((d) => d.id)).toContain(member.id)
    // The review fields cannot be set through the ordinary API.
    await api(request, 'membershipManager', 'patch', path, {
      reviewOutcome: 'retainedAll',
      retainUntil: '2099-01-01T00:00:00.000Z',
    })
    expect((await api(request, 'membershipManager', 'get', `${path}?depth=0`)).body).toMatchObject({
      reviewOutcome: 'pending',
      retainUntil: null,
    })

    // Only those who work on the register; a date in the future; "other" needs a note.
    for (const name of ['technicalAdmin', 'contentEditor', 'auditor'] as const) {
      expect(
        (await review({ keep: 'all', until: nextYear, reason: 'proof' }, name)).status,
        name,
      ).toBe(403)
    }
    expect((await review({ keep: 'all', until: '2020-01-01', reason: 'proof' })).body).toEqual({
      error: 'until',
    })
    expect((await review({ keep: 'all', until: nextYear, reason: 'other' })).body).toEqual({
      error: 'note',
    })
    expect((await review({ keep: 'all', until: nextYear, reason: 'proof' })).status).toBe(200)
    expect((await api(request, 'membershipManager', 'get', `${path}?depth=0`)).body).toMatchObject({
      reviewOutcome: 'retainedAll',
      retentionReason: 'proof',
      reviewedByName: 'E2E Mitgliederverwaltung',
      email: 'pruefung@example.org',
    })

    // Keeping only the minimal record removes the contact data: with a fresh code.
    await signedInToken(request, 'membershipManager', true)
    expect(
      (await review({ keep: 'minimal', until: nextYear, reason: 'accounting', note: 'Belege' }))
        .body,
    ).toEqual({ error: 'step_up_required' })
    await confirmStepUp(request, 'membershipManager')
    expect(
      (await review({ keep: 'minimal', until: nextYear, reason: 'accounting', note: 'Belege' }))
        .status,
    ).toBe(200)
    const minimal = (await api(request, 'membershipManager', 'get', `${path}?depth=0`)).body as Doc
    expect(minimal).toMatchObject({
      firstName: 'E2E',
      lastName: `Prüfung ${worker()}`,
      email: null,
      address: { street: null, postalCode: null, city: null, country: null },
      reviewOutcome: 'retainedMinimal',
      retentionReason: 'accounting',
      retentionNote: 'Belege',
    })
    expect(minimal.contactDataRemovedOn).toBeTruthy()
    expect((await review({ keep: 'all', until: nextYear, reason: 'proof' })).body).toEqual({
      error: 'already_minimal',
    })
    // A reduced entry cannot simply become active again.
    expect(
      (await api(request, 'membershipManager', 'patch', path, { status: 'active' })).status,
    ).toBe(400)

    // Recorded: history, audit log (with the code), and the super administrators are told.
    const history = await events(request, `where[member][equals]=${member.id}`)
    expect(history.filter((e) => e.event === 'member.reviewed').map((e) => e.to)).toEqual([
      'retainedAll',
      'retainedMinimal',
    ])
    const audit = await api(
      request,
      'superAdmin',
      'get',
      `/api/audit-log?where[action][equals]=member.reviewed&where[targetId][equals]=${member.id}&sort=createdAt&depth=0`,
    )
    expect((audit.body?.docs as Doc[]).map((d) => d.stepUp)).toEqual([false, true])
    const admins = await feed(request, 'superAdmin')
    expect(
      admins.items.some((n) => n.kind === 'memberReduced' && n.subjectId === String(member.id)),
    ).toBe(true)
  })

  test('the register list: tabs, search, add and export for the right roles', async ({
    page,
    request,
  }) => {
    await signInBrowser(page.context(), request, 'membershipManager')
    await page.goto(adminUrl(`/admin/collections/members?q=Mitglied+${worker()}`))
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Mitglieder')
    await expect(page.locator('table.yop-records tbody tr')).toHaveCount(1)
    await expect(page.getByRole('link', { name: 'Mitglied erfassen' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Exportieren' })).toBeVisible()
  })
})

test.describe('export of personal data', () => {
  /** The approved purpose of the fixtures for a dataset (scripts/e2e-fixtures.ts). */
  async function fixturePurpose(request: APIRequestContext, dataset: 'members' | 'applications') {
    const { body } = await api(
      request,
      'membershipManager',
      'get',
      `/api/processing-purposes?where[dataset][equals]=${dataset}&where[status][equals]=approved&where[name][like]=E2E%20Zweck&depth=0`,
    )
    const doc = (body?.docs as Doc[])[0]
    expect(doc, dataset).toBeTruthy()
    return doc!.id
  }
  const body = (purposeId: number, overrides: Record<string, unknown> = {}) => ({
    dataset: 'members',
    purposeId,
    columns: ['firstName', 'lastName', 'email'],
    filter: { status: 'all', q: `Formel ${worker()}` },
    purpose: 'Einladung zur Mitgliederversammlung 2026',
    confirmed: true,
    ...overrides,
  })

  test('needs the permission, a fresh code and an approved purpose with its columns; CSV is safe', async ({
    request,
  }) => {
    // Up to three new one-time codes (sign-ins and the confirmation) wait for the next 30 s step.
    test.setTimeout(180_000)
    // A name a spreadsheet would run as a formula.
    expect(
      (
        await api(request, 'membershipManager', 'post', '/api/members', {
          firstName: '=HYPERLINK("http://example.org")',
          lastName: `Formel ${worker()}`,
          email: 'formel@example.org',
          address: { street: 'E2E 3', postalCode: '00000', city: 'E2E', country: 'E2E' },
          membershipType: 'ordinary',
          memberSince: '2021-01-01T12:00:00.000Z',
        })
      ).status,
    ).toBe(201)
    const members = await fixturePurpose(request, 'members')
    const applications = await fixturePurpose(request, 'applications')
    const run = (overrides: Record<string, unknown> = {}) =>
      api(request, 'membershipManager', 'post', '/api/exports/run', body(members, overrides))

    for (const name of ['technicalAdmin', 'contentEditor', 'auditor'] as const) {
      const refused = await api(request, name, 'post', '/api/exports/run', body(members))
      expect(refused.status, name).toBe(403)
    }
    // A new session: one this worker used before may still hold a recent code confirmation.
    await signedInToken(request, 'membershipManager', true)
    expect(await run()).toMatchObject({ status: 403, body: { error: 'step_up_required' } })
    await confirmStepUp(request, 'membershipManager')
    expect((await run({ purpose: 'kurz' })).body).toEqual({ error: 'occasion' })
    expect((await run({ confirmed: undefined })).body).toEqual({ error: 'confirm' })
    // A purpose for another dataset, one that does not exist: no export.
    for (const purposeId of [applications, 999_999, 'x']) {
      expect((await run({ purposeId })).body, String(purposeId)).toEqual({
        error: 'purpose_not_approved',
      })
    }
    // Only the purpose's columns (it allows first and last name, e-mail, city, member since).
    for (const columns of [['street'], ['email', 'postalCode'], ['internalNotes'], []]) {
      expect((await run({ columns })).body, String(columns)).toEqual({ error: 'columns' })
    }

    const download = (separator: string) =>
      request.post(adminUrl('/api/exports/run'), {
        headers: { 'X-Forwarded-For': freshAddress() },
        data: body(members, { separator }),
      })
    const headers = await authHeaders(request, 'membershipManager')
    const response = await request.post(adminUrl('/api/exports/run'), {
      headers: { ...headers, 'X-Forwarded-For': freshAddress() },
      data: body(members),
    })
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('text/csv')
    expect(response.headers()['cache-control']).toContain('no-store')
    const csv = (await response.body()).toString('utf8')
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    const lines = csv.slice(1).trim().split('\r\n')
    expect(lines[0]).toBe('"Vorname";"Nachname";"E-Mail"')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toBe(
      `"'=HYPERLINK(""http://example.org"")";"Formel ${worker()}";"formel@example.org"`,
    )
    const exportId = Number(response.headers()['x-export-id'])
    // Without a session the endpoint refuses; with commas for Excel in English it works.
    expect((await download(',')).status()).toBe(401)
    const comma = await request.post(adminUrl('/api/exports/run'), {
      headers: { ...headers, 'X-Forwarded-For': freshAddress() },
      data: body(members, { separator: ',' }),
    })
    expect((await comma.body()).toString('utf8').slice(1).split('\r\n')[0]).toBe(
      '"Vorname","Nachname","E-Mail"',
    )

    // The register: purpose, legal basis, occasion, columns, who and when; no personal data.
    const own = await api(request, 'membershipManager', 'get', '/api/exports?limit=100&depth=0')
    const ownEntries = own.body?.docs as Doc[]
    expect(ownEntries.map((d) => d.id)).toContain(exportId)
    expect(ownEntries.every((d) => d.actorName === 'E2E Mitgliederverwaltung')).toBe(true)
    const entry = ownEntries.find((d) => d.id === exportId)!
    expect(entry).toMatchObject({
      dataset: 'members',
      rows: 1,
      processingPurpose: members,
      processingPurposeName: 'E2E Zweck Mitglieder (Test)',
      purpose: 'Einladung zur Mitgliederversammlung 2026',
      legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO – Vertrag oder vorvertragliche Maßnahmen',
      legalBasisCode: 'b',
      columns: ['firstName', 'lastName', 'email'],
      filter: { status: 'all', search: 'yes' },
      actorRole: 'membershipManager',
    })
    expect(entry.createdAt).toBeTruthy()
    expect(JSON.stringify(entry)).not.toContain('Formel')
    for (const name of ['auditor', 'boardAdmin', 'superAdmin'] as const) {
      const review = await api(request, name, 'get', `/api/exports/${exportId}?depth=0`)
      expect(review.status, name).toBe(200)
    }
    for (const name of ['technicalAdmin', 'contentEditor'] as const) {
      expect((await api(request, name, 'get', '/api/exports')).status, name).toBe(403)
    }
    // Recorded in the audit log, confirmed with a code; reviewers are notified.
    const audit = await api(
      request,
      'superAdmin',
      'get',
      `/api/audit-log?where[action][equals]=export.created&where[targetId][equals]=${exportId}&depth=0`,
    )
    expect((audit.body?.docs as Doc[])[0]).toMatchObject({ area: 'association', stepUp: true })
    const board = await feed(request, 'boardAdmin')
    expect(
      board.items.some((n) => n.kind === 'exportCreated' && n.subjectId === String(exportId)),
    ).toBe(true)
    // The register cannot be changed or deleted through the API.
    expect(
      (await api(request, 'superAdmin', 'patch', `/api/exports/${exportId}`, { purpose: 'x' }))
        .status,
    ).toBe(403)
    expect((await api(request, 'superAdmin', 'delete', `/api/exports/${exportId}`)).status).toBe(
      403,
    )
  })

  test('purposes: approved only by a super administrator with a code; changes take it back', async ({
    request,
  }) => {
    // The six legal bases of Art. 6(1) GDPR: read by those who export or review, fixed list.
    const bases = await api(request, 'superAdmin', 'get', '/api/legal-bases?depth=0&locale=de')
    const docs = bases.body?.docs as (Doc & { code: string; title: string })[]
    expect(docs.map((d) => d.code)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    const basisF = docs.find((d) => d.code === 'f')!
    expect((await api(request, 'membershipManager', 'get', '/api/legal-bases')).status).toBe(200)
    expect((await api(request, 'auditor', 'get', '/api/legal-bases')).status).toBe(200)
    for (const name of ['technicalAdmin', 'contentEditor'] as const) {
      expect((await api(request, name, 'get', '/api/legal-bases')).status, name).toBe(403)
      expect((await api(request, name, 'get', '/api/processing-purposes')).status, name).toBe(403)
    }
    expect(
      (await api(request, 'superAdmin', 'post', '/api/legal-bases', { code: 'a' })).status,
    ).toBe(403)
    expect(
      (await api(request, 'superAdmin', 'delete', `/api/legal-bases/${basisF.id}`)).status,
    ).toBe(403)

    // A new purpose is a draft, whatever is sent; only super administrators create it.
    const data = {
      name: `E2E Prüfzweck ${worker()}`,
      dataset: 'members',
      legalBasis: basisF.id,
      justification: 'Abwägung: interne Planung einer Vereinsveranstaltung.',
      columns: ['firstName', 'lastName'],
      status: 'approved',
      decisionReference: 'erfunden',
    }
    expect(
      (await api(request, 'membershipManager', 'post', '/api/processing-purposes', data)).status,
    ).toBe(403)
    const created = await api(request, 'superAdmin', 'post', '/api/processing-purposes', data)
    expect(created.status).toBe(201)
    const purpose = created.body?.doc as Doc
    expect(purpose).toMatchObject({ status: 'draft', decisionReference: null })
    const purposePath = `/api/processing-purposes/${purpose.id}`
    const exportWith = () =>
      api(request, 'membershipManager', 'post', '/api/exports/run', {
        dataset: 'members',
        purposeId: purpose.id,
        columns: ['lastName'],
        filter: { status: 'all', q: `Mitglied ${worker()}` },
        purpose: 'Planung des Sommerfests im Verein',
        confirmed: true,
      })
    await confirmStepUp(request, 'membershipManager')
    expect((await exportWith()).body).toEqual({ error: 'purpose_not_approved' })

    // Approval: settings.manage only, with a code and the association's decision.
    expect((await api(request, 'boardAdmin', 'post', `${purposePath}/approve`, {})).status).toBe(
      403,
    )
    await signedInToken(request, 'superAdmin', true)
    expect(
      (
        await api(request, 'superAdmin', 'post', `${purposePath}/approve`, {
          decisionReference: 'Beschluss',
        })
      ).body,
    ).toEqual({ error: 'step_up_required' })
    await confirmStepUp(request, 'superAdmin')
    expect((await api(request, 'superAdmin', 'post', `${purposePath}/approve`, {})).body).toEqual({
      error: 'incomplete',
      problems: ['decision'],
    })
    const approve = () =>
      api(request, 'superAdmin', 'post', `${purposePath}/approve`, {
        decisionReference: 'Vorstandsbeschluss vom 20.10.2026 (Test)',
      })
    expect((await approve()).status).toBe(200)
    expect((await api(request, 'superAdmin', 'get', `${purposePath}?depth=0`)).body).toMatchObject({
      status: 'approved',
      decisionReference: 'Vorstandsbeschluss vom 20.10.2026 (Test)',
      approvedByName: 'E2E Super-Admin',
    })
    const exported = await exportWith()
    expect(exported.status).toBe(200)

    // A legal basis switched off blocks exports for purposes resting on it.
    expect(
      (
        await api(request, 'superAdmin', 'patch', `/api/legal-bases/${basisF.id}`, {
          available: false,
        })
      ).status,
    ).toBe(200)
    expect((await exportWith()).body).toEqual({ error: 'legal_basis' })
    await api(request, 'superAdmin', 'patch', `/api/legal-bases/${basisF.id}`, { available: true })

    // Setting the status directly does nothing; changing what was approved makes it a draft.
    await api(request, 'superAdmin', 'patch', purposePath, { status: 'retired' })
    expect((await api(request, 'superAdmin', 'get', `${purposePath}?depth=0`)).body?.status).toBe(
      'approved',
    )
    await api(request, 'superAdmin', 'patch', purposePath, { columns: ['lastName', 'email'] })
    expect((await api(request, 'superAdmin', 'get', `${purposePath}?depth=0`)).body).toMatchObject({
      status: 'draft',
      decisionReference: null,
      approvedOn: null,
    })
    expect((await exportWith()).body).toEqual({ error: 'purpose_not_approved' })

    // Retired: no exports; used once, it can no longer be deleted.
    expect((await approve()).status).toBe(200)
    expect((await api(request, 'superAdmin', 'post', `${purposePath}/retire`, {})).status).toBe(200)
    expect((await exportWith()).body).toEqual({ error: 'purpose_not_approved' })
    expect((await api(request, 'superAdmin', 'post', `${purposePath}/reopen`, {})).status).toBe(200)
    expect((await api(request, 'superAdmin', 'delete', purposePath)).status).toBe(409)

    const log = await api(
      request,
      'superAdmin',
      'get',
      `/api/audit-log?where[action][equals]=purpose.approve&where[targetId][equals]=${purpose.id}&depth=0`,
    )
    expect((log.body?.docs as Doc[])[0]).toMatchObject({ stepUp: true, area: 'association' })
  })

  test('the export screen: purpose, legal basis, its columns, occasion, confirmation, code', async ({
    page,
    request,
  }) => {
    // A new session: one this worker used before may still hold a recent code confirmation.
    await signInBrowser(page.context(), request, 'boardAdmin', true)
    await page.goto(adminUrl(`/admin/export?dataset=members&status=all&q=Mitglied+${worker()}`))
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Export personenbezogener Daten',
    )
    const download = page.getByRole('button', { name: 'CSV herunterladen' })
    await expect(download).toBeDisabled()
    await page.getByRole('radio', { name: /E2E Zweck Mitglieder \(Test\)/ }).check()
    await expect(
      page.getByRole('heading', {
        name: 'Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO – Vertrag oder vorvertragliche Maßnahmen',
      }),
    ).toBeVisible()
    await expect(page.getByText('E2E Begründung für den Test der Exporte.')).toBeVisible()
    // Only the purpose's columns, all chosen to start with.
    const columns = page.getByRole('group', { name: 'Spalten' }).getByRole('checkbox')
    await expect(columns).toHaveCount(5)
    await expect(page.getByRole('checkbox', { name: 'Straße und Hausnummer' })).toHaveCount(0)
    await page.getByRole('checkbox', { name: 'E-Mail', exact: true }).uncheck()
    await page.getByLabel('Konkreter Anlass').fill('Prüfung der Mitgliederliste durch den Vorstand')
    await expect(download).toBeDisabled()
    await page.getByRole('checkbox', { name: /Ich bestätige/ }).check()
    await download.click()
    const dialog = page.getByRole('dialog', { name: 'Mit Code bestätigen' })
    await expect(dialog).toBeVisible()
    const { nextCode } = await import('./auth')
    await dialog.getByLabel('Code aus der App').fill(await nextCode('boardAdmin'))
    const file = page.waitForEvent('download')
    await dialog.getByRole('button', { name: 'Bestätigen' }).click()
    expect((await file).suggestedFilename()).toMatch(/^mitglieder-\d{4}-\d{2}-\d{2}\.csv$/)
    await expect(
      page.getByRole('status').filter({ hasText: 'Export erstellt: 1 Zeilen' }),
    ).toBeVisible()
  })
})

test.describe('notifications', () => {
  test('assignment reaches the person assigned; marking as read works', async ({ request }) => {
    const app = await application(request, `Minderjährig ${worker()}`).catch(() => null)
    const target = app ?? (await application(request, `Wiedervorlage ${worker()}`))
    const mm = await api(request, 'membershipManager', 'get', '/api/users/me')
    const mmId = (mm.body?.user as { id: number }).id
    await api(request, 'boardAdmin', 'patch', `/api/membership-applications/${target.id}`, {
      assignedTo: null,
    })
    expect(
      (
        await api(request, 'boardAdmin', 'patch', `/api/membership-applications/${target.id}`, {
          assignedTo: mmId,
        })
      ).status,
    ).toBe(200)
    const before = await feed(request, 'membershipManager')
    const notice = before.items.find(
      (n) => n.kind === 'assigned' && n.subjectId === String(target.id),
    )
    expect(notice?.read).toBe(false)
    expect(
      (
        await api(request, 'membershipManager', 'post', '/api/notifications/read', {
          ids: [notice!.id],
        })
      ).status,
    ).toBe(200)
    const after = await feed(request, 'membershipManager')
    expect(after.items.find((n) => n.id === notice!.id)?.read).toBe(true)
    // Nobody reads or marks anyone else's notifications.
    const others = await api(request, 'technicalAdmin', 'get', `/api/notifications/${notice!.id}`)
    expect(others.status).not.toBe(200)
    expect(
      (await api(request, 'membershipManager', 'post', '/api/notifications', { kind: 'assigned' }))
        .status,
    ).toBe(403)
  })

  test('the daily reminder reports a due follow-up to the person assigned', async ({ request }) => {
    const app = await application(request, `Wiedervorlage ${worker()}`)
    // Runs the jobs queued by the fixtures (reminders, retention, audit retention).
    expect(
      (await api(request, 'superAdmin', 'get', '/api/payload-jobs/run?queue=maintenance')).status,
    ).toBe(200)
    const mm = await feed(request, 'membershipManager')
    expect(mm.items.some((n) => n.kind === 'followUpDue' && n.subjectId === String(app.id))).toBe(
      true,
    )
    const tech = await feed(request, 'technicalAdmin')
    expect(tech.items.filter((n) => n.kind !== 'newDevice')).toEqual([])
  })

  test('reviews due are reported; old notifications go: read after 30 days, unread after 90', async ({
    request,
  }) => {
    expect(
      (await api(request, 'superAdmin', 'get', '/api/payload-jobs/run?queue=maintenance')).status,
    ).toBe(200)
    const ended = (
      await api(
        request,
        'membershipManager',
        'get',
        `/api/members?where[lastName][equals]=${encodeURIComponent(`Beendet ${worker()}`)}&depth=0`,
      )
    ).body?.docs as Doc[]
    const mm = await feed(request, 'membershipManager')
    expect(
      mm.items.some((n) => n.kind === 'memberReviewDue' && n.subjectId === String(ended[0]!.id)),
    ).toBe(true)

    const auditor = await feed(request, 'auditor')
    const kept = auditor.items.map((n) => n.subjectId)
    expect(kept).toEqual(expect.arrayContaining([`9000${worker()}2`, `9000${worker()}4`]))
    expect(kept).not.toContain(`9000${worker()}1`)
    expect(kept).not.toContain(`9000${worker()}3`)
    // Security events are in the audit log, which keeps its own period.
    const log = await api(
      request,
      'superAdmin',
      'get',
      '/api/audit-log?where[action][equals]=auth.new_device&limit=1&depth=0',
    )
    expect((log.body?.totalDocs as number) > 0).toBe(true)
  })

  test('the bell shows unread notifications and links to them', async ({ page, request }) => {
    await signInBrowser(page.context(), request, 'membershipManager')
    await page.goto(adminUrl('/admin'))
    const bell = page.getByRole('button', { name: /^Benachrichtigungen, \d+ ungelesen$/ })
    await expect(bell).toBeVisible()
    await bell.click()
    const panel = page.getByRole('region', { name: 'Benachrichtigungen' })
    await expect(panel).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(bell).toBeFocused()
    await page.goto(adminUrl('/admin/notifications'))
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Benachrichtigungen')
  })
})

test.describe('separation of duties', () => {
  test('technical administrator, content editor and auditor reach no membership data', async ({
    page,
    request,
  }) => {
    for (const name of ['technicalAdmin', 'contentEditor', 'auditor'] as const) {
      for (const path of ['/api/members', '/api/case-events', '/api/membership-applications']) {
        expect((await api(request, name, 'get', path)).status, `${name} ${path}`).toBe(403)
      }
      expect(
        (await api(request, name, 'post', '/api/members', { lastName: 'x' })).status,
        name,
      ).toBe(403)
    }
    await signInBrowser(page.context(), request, 'technicalAdmin')
    await page.goto(adminUrl('/admin'))
    await expect(
      page.locator('#nav-members, #nav-export, #nav-membership-applications'),
    ).toHaveCount(0)
    await page.goto(adminUrl('/admin/export'))
    await expect(page.locator('body')).toContainText(
      'Für den Export personenbezogener Daten fehlt Ihnen die Berechtigung.',
    )
  })
})

test.describe('accessibility of the CC-1 screens', () => {
  for (const [label, theme, language] of [
    ['light, German', 'light', 'de'],
    ['dark, Arabic', 'dark', 'ar'],
  ] as const) {
    test(`lists, export and notifications (${label})`, async ({ page, request }) => {
      await page.context().addCookies([
        { name: 'payload-theme', value: theme, url: adminUrl('/') },
        { name: 'payload-lng', value: language, url: adminUrl('/') },
      ])
      await signInBrowser(page.context(), request, 'boardAdmin')
      const results = []
      for (const path of [
        '/admin/collections/membership-applications?stage=all',
        '/admin/collections/members?status=all',
        '/admin/export',
        '/admin/notifications',
      ]) {
        await page.goto(adminUrl(path), { waitUntil: 'networkidle' })
        results.push(await new AxeBuilder({ page }).include('.yop-page').analyze())
      }
      const violations = results.flatMap((r) =>
        r.violations.map((v) => `${v.id}: ${v.nodes.length}`),
      )
      expect(violations).toEqual([])
    })
  }
})
