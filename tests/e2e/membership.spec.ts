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
      ].sort(),
    )

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
  const body = (overrides: Record<string, unknown> = {}) => ({
    dataset: 'members',
    columns: ['firstName', 'lastName', 'email'],
    filter: { status: 'all', q: `Formel ${worker()}` },
    purpose: 'Einladung zur Mitgliederversammlung 2026',
    ...overrides,
  })

  test('needs the permission, a fresh code, a purpose and a legal basis; CSV is safe', async ({
    request,
  }) => {
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
    const settings = await api(
      request,
      'membershipManager',
      'get',
      '/api/globals/control-center-settings?depth=0',
    )
    const basis = (settings.body?.exportLegalBases as { id: string }[])[0]!.id

    for (const name of ['technicalAdmin', 'contentEditor', 'auditor'] as const) {
      const refused = await api(
        request,
        name,
        'post',
        '/api/exports/run',
        body({ legalBasis: basis }),
      )
      expect(refused.status, name).toBe(403)
    }
    // A new session: one this worker used before may still hold a recent code confirmation.
    await signedInToken(request, 'membershipManager', true)
    const noCode = await api(
      request,
      'membershipManager',
      'post',
      '/api/exports/run',
      body({ legalBasis: basis }),
    )
    expect(noCode).toMatchObject({ status: 403, body: { error: 'step_up_required' } })
    await confirmStepUp(request, 'membershipManager')
    expect(
      (
        await api(
          request,
          'membershipManager',
          'post',
          '/api/exports/run',
          body({ legalBasis: basis, purpose: 'kurz' }),
        )
      ).body,
    ).toEqual({ error: 'purpose' })
    expect(
      (
        await api(
          request,
          'membershipManager',
          'post',
          '/api/exports/run',
          body({ legalBasis: 'unknown' }),
        )
      ).body,
    ).toEqual({ error: 'legal_basis' })
    expect(
      (
        await api(
          request,
          'membershipManager',
          'post',
          '/api/exports/run',
          body({ legalBasis: basis, columns: ['internalNotes'] }),
        )
      ).body,
    ).toEqual({ error: 'columns' })

    const response = await request.post(adminUrl('/api/exports/run'), {
      headers: {
        ...(await authHeaders(request, 'membershipManager')),
        'X-Forwarded-For': freshAddress(),
      },
      data: body({ legalBasis: basis }),
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

    // The register: own entries for the person who exported, all for reviewers, none otherwise.
    const own = await api(request, 'membershipManager', 'get', '/api/exports?limit=100&depth=0')
    const ownEntries = own.body?.docs as Doc[]
    expect(ownEntries.map((d) => d.id)).toContain(exportId)
    expect(ownEntries.every((d) => d.actorName === 'E2E Mitgliederverwaltung')).toBe(true)
    const entry = ownEntries.find((d) => d.id === exportId)!
    expect(entry).toMatchObject({
      dataset: 'members',
      rows: 1,
      purpose: 'Einladung zur Mitgliederversammlung 2026',
      legalBasis: 'E2E Rechtsgrundlage (Test)',
      columns: ['firstName', 'lastName', 'email'],
      filter: { status: 'all', search: 'yes' },
    })
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

  test('the export screen asks for a code and downloads the file', async ({ page, request }) => {
    // A new session: one this worker used before may still hold a recent code confirmation.
    await signInBrowser(page.context(), request, 'boardAdmin', true)
    await page.goto(adminUrl(`/admin/export?dataset=members&status=all&q=Mitglied+${worker()}`))
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Export personenbezogener Daten',
    )
    await page.getByLabel('Zweck').fill('Prüfung der Mitgliederliste durch den Vorstand')
    await page.getByLabel('Rechtsgrundlage').selectOption({ label: 'E2E Rechtsgrundlage (Test)' })
    await page.getByRole('button', { name: 'CSV herunterladen' }).click()
    const dialog = page.getByRole('dialog', { name: 'Mit Code bestätigen' })
    await expect(dialog).toBeVisible()
    const { nextCode } = await import('./auth')
    await dialog.getByLabel('Code aus der App').fill(await nextCode('boardAdmin'))
    const download = page.waitForEvent('download')
    await dialog.getByRole('button', { name: 'Bestätigen' }).click()
    const file = await download
    expect(file.suggestedFilename()).toMatch(/^mitglieder-\d{4}-\d{2}-\d{2}\.csv$/)
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
