import AxeBuilder from '@axe-core/playwright'
import type { APIRequestContext, Page } from '@playwright/test'

import { authHeaders, confirmStepUp, nextCode, signedInToken, signInBrowser } from './auth'
import { adminUrl } from './fixtures'
import type { AccountName } from './secrets'
import { expect, test } from './test'

/**
 * The operations screens and actions (CC-3) against the stand-in agent of the e2e server
 * (tests/e2e/fake-agent.ts), which checks signatures like the real one and serves fixed data.
 */
const SCREENS = [
  '/admin/operations',
  '/admin/operations/backups',
  '/admin/operations/logs',
  '/admin/operations/domains',
]

/** Signed in, with the interface in German (the browser's own language would be English). */
async function signIn(page: Page, request: APIRequestContext, name: AccountName, fresh = false) {
  await page.context().addCookies([{ name: 'payload-lng', value: 'de', url: adminUrl('/') }])
  await signInBrowser(page.context(), request, name, fresh)
}

/** Collects from the agent now (another worker may just have done it: then that run counts). */
async function collected(request: APIRequestContext) {
  const headers = await authHeaders(request, 'technicalAdmin')
  await expect
    .poll(
      async () => {
        const refresh = await request.post(adminUrl('/api/operations/refresh'), { headers })
        if (![200, 429].includes(refresh.status())) return `refresh ${refresh.status()}`
        const state = await request.get(adminUrl('/api/globals/operations-state'), { headers })
        const body = (await state.json()) as { lastContactAt?: string; certificates?: unknown[] }
        return body.lastContactAt && body.certificates?.length ? 'ok' : 'waiting'
      },
      { timeout: 60_000, intervals: [1_000, 5_000, 10_000] },
    )
    .toBe('ok')
}

const auditOf = async (request: APIRequestContext, action: string) => {
  const response = await request.get(
    adminUrl(`/api/audit-log?where[action][equals]=${action}&sort=-createdAt&limit=5&depth=0`),
    { headers: await authHeaders(request, 'technicalAdmin') },
  )
  expect(response.status()).toBe(200)
  return (
    (await response.json()) as {
      docs: { targetId?: string; result: string; stepUp: boolean; actorName?: string }[]
    }
  ).docs
}

test.describe('operations: permissions', () => {
  test('reading needs operations.read, acting operations.act and a fresh code', async ({
    request,
  }) => {
    const read: [AccountName, number][] = [
      ['superAdmin', 200],
      ['technicalAdmin', 200],
      ['boardAdmin', 200],
      ['auditor', 200],
      ['contentEditor', 403],
      ['membershipManager', 403],
    ]
    for (const [name, status] of read) {
      const response = await request.get(adminUrl('/api/operations/logs?service=app&lines=50'), {
        headers: await authHeaders(request, name),
      })
      expect(response.status(), `logs as ${name}`).toBe(status)
    }
    for (const name of ['boardAdmin', 'auditor', 'contentEditor'] as const) {
      for (const path of ['restart', 'backup', 'drill']) {
        const response = await request.post(adminUrl(`/api/operations/${path}`), {
          headers: await authHeaders(request, name),
          data: { service: 'app', confirm: 'app' },
        })
        expect(response.status(), `${path} as ${name}`).toBe(403)
        expect(((await response.json()) as { error: string }).error).toBe('not_allowed')
      }
    }
    // Without a session nothing at all.
    const anonymous = await request.post(adminUrl('/api/operations/backup'))
    expect(anonymous.status()).toBe(401)
  })

  test('a restart needs a code and the typed name, only app and Caddy, and is logged', async ({
    request,
  }) => {
    // A fresh sign-in and then a code: the second code waits for the next 30-second step.
    test.setTimeout(90_000)
    const token = await signedInToken(request, 'technicalAdmin', true)
    const headers = { Authorization: `JWT ${token}` }
    const restart = (data: Record<string, unknown>) =>
      request.post(adminUrl('/api/operations/restart'), { headers, data })
    const first = await restart({ service: 'app', confirm: 'app' })
    expect(first.status()).toBe(403)
    expect(((await first.json()) as { error: string }).error).toBe('step_up_required')
    await confirmStepUp(request, 'technicalAdmin')
    expect((await restart({ service: 'postgres', confirm: 'postgres' })).status()).toBe(400)
    expect((await restart({ service: 'app', confirm: 'App' })).status()).toBe(400)
    const accepted = await restart({ service: 'caddy', confirm: 'caddy' })
    expect(accepted.status()).toBe(202)
    const [entry] = await auditOf(request, 'ops.restart')
    expect(entry).toMatchObject({ targetId: 'caddy', result: 'ok', stepUp: true })
  })

  test('running a job: deleting ones need a code, and only with jobs.run', async ({ request }) => {
    const token = await signedInToken(request, 'technicalAdmin', true)
    const run = (task: string, auth = `JWT ${token}`) =>
      request.post(adminUrl('/api/operations/jobs/run'), {
        headers: { Authorization: auth },
        data: { task },
      })
    const collect = await run('ops-collect')
    expect(collect.status()).toBe(200)
    expect(((await collect.json()) as { ok: boolean }).ok).toBe(true)
    const retention = await run('retention')
    expect(retention.status()).toBe(403)
    expect(((await retention.json()) as { error: string }).error).toBe('step_up_required')
    expect((await run('not-a-task')).status()).toBe(400)
    const board = await run('ops-collect', (await authHeaders(request, 'boardAdmin')).Authorization)
    expect(board.status()).toBe(403)
    const [entry] = await auditOf(request, 'ops.job_run')
    expect(entry).toMatchObject({ targetId: 'ops-collect', result: 'ok' })
  })

  test('roles without operations see neither the menu nor the screens', async ({
    page,
    request,
  }) => {
    await signIn(page, request, 'contentEditor')
    await page.goto(adminUrl('/admin'))
    await expect(page.locator('aside.yop-nav')).not.toContainText('Betrieb')
    await page.goto(adminUrl('/admin/operations'))
    await expect(page.getByText('Dafür fehlt Ihrer Rolle die Berechtigung.')).toBeVisible()
    await expect(page.locator('.yop-ops-table')).toHaveCount(0)
  })
})

test.describe('operations: screens', () => {
  test.beforeEach(async ({ request }) => {
    await collected(request)
  })

  test('status: services, resources, release, database and tasks', async ({ page, request }) => {
    await signIn(page, request, 'technicalAdmin')
    await page.goto(adminUrl('/admin/operations'))
    await expect(page.getByRole('heading', { level: 1, name: 'Dienste & Status' })).toBeVisible()
    const services = page.locator('.yop-ops-table').first()
    await expect(services.getByRole('row')).toHaveCount(6)
    await expect(services).toContainText('Website & Control Center')
    await expect(services).toContainText('Läuft · gesund')
    // Restart offered for the app and Caddy only.
    await expect(services.getByRole('button', { name: /^Neu starten/ })).toHaveCount(2)
    await expect(page.locator('figure.yop-chart')).toHaveCount(3)
    await expect(page.locator('.yop-chart__line').first()).toHaveAttribute('d', /^M/)
    await expect(page.getByText('PostgreSQL', { exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: /Serverstatus abrufen/ })).toBeVisible()
    // The chart's values are also available as a table.
    await page.locator('.yop-chart__table summary').first().click()
    await expect(page.locator('.yop-chart__table tbody tr').first()).toBeVisible()
  })

  test('the dashboard shows services, last backup and certificates', async ({ page, request }) => {
    await signIn(page, request, 'auditor')
    await page.goto(adminUrl('/admin'))
    const tiles = page.locator('.yop-grid--stats')
    await expect(tiles.getByRole('link', { name: /Dienste\s*5 von 5 laufen/ })).toBeVisible()
    await expect(tiles.getByRole('link', { name: /Letzte Sicherung/ })).toHaveAttribute(
      'href',
      '/admin/operations/backups',
    )
    await expect(tiles.getByRole('link', { name: /Zertifikate\s*noch 61 Tage/ })).toBeVisible()
  })

  test('backups: last results, history with the failure, snapshots, no restore', async ({
    page,
    request,
  }) => {
    await signIn(page, request, 'technicalAdmin')
    await page.goto(adminUrl('/admin/operations/backups'))
    await expect(page.getByRole('heading', { level: 1, name: 'Sicherungen' })).toBeVisible()
    await expect(page.getByText('7 täglich · 4 wöchentlich · 6 monatlich')).toBeVisible()
    const history = page.locator('.yop-ops-table').first()
    await expect(history).toContainText('repository is locked')
    await expect(history).toContainText('64 Tabellen mit 1.840 Zeilen verglichen')
    await expect(page.getByText('a1b2c3d4')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Jetzt sichern' })).toBeVisible()
    await expect(
      page.getByText(/lässt sich im Control Center bewusst nicht zurücksetzen/),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /wiederherstellen$/i })).toHaveCount(0)
  })

  test('logs: loaded on request, masked, filtered, and the view is logged', async ({
    page,
    request,
  }) => {
    await signIn(page, request, 'technicalAdmin')
    await page.goto(adminUrl('/admin/operations/logs'))
    await expect(page.locator('.yop-log')).toHaveCount(0)
    await page.getByRole('button', { name: 'Laden' }).click()
    const lines = page.locator('.yop-log__line')
    await expect(lines).toHaveCount(5)
    await expect(page.locator('.yop-log')).toContainText('i***@yop-ye.org')
    await page.getByLabel('Nur Warnungen und Fehler').check()
    await expect(lines).toHaveCount(2)
    await page.getByLabel('In den Zeilen suchen').fill('render')
    await expect(lines).toHaveCount(1)
    await expect(lines.first()).toContainText('ERROR')
    const [entry] = await auditOf(request, 'ops.logs_read')
    expect(entry).toMatchObject({ targetId: 'app', result: 'ok' })
  })

  test('domains: the certificates Caddy serves', async ({ page, request }) => {
    await signIn(page, request, 'auditor')
    await page.goto(adminUrl('/admin/operations/domains'))
    const table = page.locator('.yop-ops-table')
    await expect(table).toContainText('verwaltung.yop-ye.org')
    await expect(table).toContainText('61 Tage')
    await expect(table).toContainText('gültig')
  })

  test('the restart dialog: the name first, then a code', async ({ page, request }) => {
    // Up to 30 s for a code from the next time step.
    test.setTimeout(90_000)
    // A new session: no code confirmed yet.
    await signIn(page, request, 'technicalAdmin', true)
    await page.goto(adminUrl('/admin/operations'))
    await page.getByRole('button', { name: 'Neu starten: Webserver (Caddy, TLS)' }).click()
    const dialog = page.getByRole('dialog', { name: 'Dienst neu starten' })
    await expect(dialog).toBeVisible()
    const confirm = dialog.getByRole('button', { name: 'Neu starten' })
    await expect(confirm).toBeDisabled()
    await dialog.getByLabel('Zur Bestätigung „caddy“ eingeben').fill('caddy')
    await confirm.click()
    const code = page.getByRole('dialog', { name: 'Mit Code bestätigen' })
    await expect(code).toBeVisible()
    await code.getByLabel('Code aus der App').fill(await nextCode('technicalAdmin'))
    await code.getByRole('button', { name: 'Bestätigen' }).click()
    await expect(page.getByText('Neustart angefordert.')).toBeVisible()
  })

  for (const [label, theme, language] of [
    ['light, German', 'light', 'de'],
    ['dark, Arabic', 'dark', 'ar'],
  ] as const) {
    test(`accessibility of the four screens (${label})`, async ({ page, request }) => {
      test.setTimeout(120_000)
      await page.context().addCookies([
        { name: 'payload-theme', value: theme, url: adminUrl('/') },
        { name: 'payload-lng', value: language, url: adminUrl('/') },
      ])
      await signInBrowser(page.context(), request, 'technicalAdmin')
      const violations: string[] = []
      for (const path of SCREENS) {
        await page.goto(adminUrl(path))
        await expect(page.locator('.yop-page h1')).toBeVisible()
        if (path.endsWith('/logs')) {
          await page.locator('.yop-ops-log-controls button').first().click()
          await expect(page.locator('.yop-log__line').first()).toBeVisible()
        }
        const result = await new AxeBuilder({ page }).include('.yop-page').analyze()
        violations.push(
          ...result.violations.map(
            (v) => `${path} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
          ),
        )
      }
      expect(violations).toEqual([])
    })
  }

  test('on a phone (Arabic) the screens fit without sideways scrolling', async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.context().addCookies([{ name: 'payload-lng', value: 'ar', url: adminUrl('/') }])
    await signInBrowser(page.context(), request, 'superAdmin')
    for (const path of SCREENS) {
      await page.goto(adminUrl(path))
      await expect(page.locator('html')).toHaveAttribute('dir', /^rtl$/i)
      if (path.endsWith('/logs')) {
        await page.locator('.yop-ops-log-controls button').first().click()
        await expect(page.locator('.yop-log__line').first()).toBeVisible()
      }
      const overflow = await fits(page)
      expect(overflow, path).toEqual([])
    }
  })
})

/** Elements wider than the screen (none expected). */
const fits = (page: Page) =>
  page.evaluate(() => {
    const wide: string[] = []
    if (document.documentElement.scrollWidth > window.innerWidth) {
      for (const element of document.querySelectorAll<HTMLElement>('.yop-page *')) {
        const box = element.getBoundingClientRect()
        if (box.right > window.innerWidth + 1 || box.left < -1) {
          wide.push(element.className || element.tagName)
        }
      }
      if (!wide.length) wide.push('document')
    }
    return wide.slice(0, 5)
  })
