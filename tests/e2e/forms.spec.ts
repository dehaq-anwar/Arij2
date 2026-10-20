import AxeBuilder from '@axe-core/playwright'
import type { APIRequestContext, Page } from '@playwright/test'

import { authHeaders } from './auth'
import { adminUrl, freshAddress } from './fixtures'
import { expect, test } from './test'

/** Every test submits from its own address, so the rate limiter counts each test separately. */
const ownAddress = (page: Page) => page.setExtraHTTPHeaders({ 'X-Forwarded-For': freshAddress() })

const asBoard = (request: APIRequestContext) => authHeaders(request, 'boardAdmin')

const findStored = async (
  request: APIRequestContext,
  collection: string,
  field: string,
  value: string,
) => {
  const response = await request.get(
    adminUrl(`/api/${collection}?where[${field}][equals]=${encodeURIComponent(value)}&depth=0`),
    { headers: await asBoard(request) },
  )
  expect(response.status()).toBe(200)
  return ((await response.json()) as { docs: Record<string, unknown>[] }).docs
}

/** A person needs a few seconds; the server rejects faster submissions silently. */
const humanPause = (page: Page) => page.waitForTimeout(3_300)

const fillContact = async (page: Page, name: string) => {
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('E-Mail').fill('e2e-kontakt@example.org')
  await page.getByLabel('Thema').selectOption('press')
  await page.getByLabel('Nachricht', { exact: true }).fill('E2E Nachricht\n\nzweiter Absatz')
  await page.locator('#contact-consent').check()
}

test.describe('contact form', () => {
  test('stores the message with a consent record and nothing else', async ({ page, request }) => {
    await ownAddress(page)
    await page.goto('/kontakt')
    const name = `E2E Kontakt ${Date.now()}`
    await fillContact(page, name)
    await humanPause(page)
    await page.getByRole('button', { name: 'Nachricht senden' }).click()
    await expect(page.getByRole('status')).toContainText('Vielen Dank!')
    await expect(page.getByRole('status').locator('[tabindex="-1"]')).toBeFocused()

    const [doc] = await findStored(request, 'contact-messages', 'name', name)
    expect(doc).toMatchObject({
      email: 'e2e-kontakt@example.org',
      topic: 'press',
      message: 'E2E Nachricht\n\nzweiter Absatz',
      locale: 'de',
      status: 'new',
      consent: { given: true, text: expect.stringContaining('Ich willige ein') },
    })
    // No address, browser or other metadata is stored with a message.
    expect(Object.keys(doc!).sort()).toEqual(
      [
        'consent',
        'createdAt',
        'email',
        'id',
        'locale',
        'message',
        'name',
        'status',
        'topic',
        'updatedAt',
      ].sort(),
    )
  })

  test('shows errors in a focused summary and keeps what was entered', async ({ page }) => {
    await ownAddress(page)
    await page.goto('/en/contact')
    await page.getByLabel('Name').fill('E2E Keeps input')
    await page.getByLabel('E-mail').fill('not-an-address')
    await page.getByRole('button', { name: 'Send message' }).click()

    const summary = page.locator('[aria-labelledby="contact-errors-heading"]')
    await expect(summary).toBeFocused()
    await expect(summary.getByRole('link')).toHaveText([
      'E-mail: Please enter a valid e-mail address, e.g. name@example.org.',
      'Message: Please fill in this field.',
      'Consent: Please confirm.',
    ])
    await expect(page.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Name')).toHaveValue('E2E Keeps input')
    await expect(page.getByLabel('Name')).not.toHaveAttribute('aria-invalid', 'true')

    const { violations } = await new AxeBuilder({ page })
      .include('#write')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(violations.map((v) => v.id)).toEqual([])
  })

  test('bots: a filled honeypot or an instant submission looks successful but is dropped', async ({
    page,
    request,
  }) => {
    await ownAddress(page)
    await page.goto('/kontakt')
    const trapped = `E2E Honeypot ${Date.now()}`
    await fillContact(page, trapped)
    await page.locator('input[name="website"]').evaluate((input: HTMLInputElement) => {
      input.value = 'https://spam.example'
    })
    await humanPause(page)
    await page.getByRole('button', { name: 'Nachricht senden' }).click()
    await expect(page.getByRole('status')).toContainText('Vielen Dank!')

    await page.goto('/kontakt')
    const hasty = `E2E Zu schnell ${Date.now()}`
    await fillContact(page, hasty)
    await page.getByRole('button', { name: 'Nachricht senden' }).click()
    await expect(page.getByRole('status')).toContainText('Vielen Dank!')

    expect(await findStored(request, 'contact-messages', 'name', trapped)).toEqual([])
    expect(await findStored(request, 'contact-messages', 'name', hasty)).toEqual([])
  })

  test('is rate limited per address: 5 attempts per 10 minutes', async ({ page }) => {
    await ownAddress(page)
    for (let attempt = 1; attempt <= 6; attempt++) {
      await page.goto('/kontakt')
      await fillContact(page, `E2E Limit ${attempt}`)
      await page.getByRole('button', { name: 'Nachricht senden' }).click()
      if (attempt <= 5) await expect(page.getByRole('status')).toContainText('Vielen Dank!')
    }
    await expect(page.locator('[aria-labelledby="contact-errors-heading"]')).toContainText(
      'Zu viele Versuche',
    )
    // Another address is not affected.
    await ownAddress(page)
    await page.goto('/kontakt')
    await fillContact(page, 'E2E Other address')
    await page.getByRole('button', { name: 'Nachricht senden' }).click()
    await expect(page.getByRole('status')).toContainText('Vielen Dank!')
  })

  test('works without JavaScript', async ({ browser, request }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      extraHTTPHeaders: { 'X-Forwarded-For': freshAddress() },
    })
    const page = await context.newPage()
    await page.goto('/ar/contact')
    await page.getByRole('button', { name: 'إرسال الرسالة' }).click()
    await expect(page).toHaveURL('/ar/contact#write')
    await expect(page.locator('#contact-errors-heading')).toHaveText('يُرجى مراجعة البيانات')

    const name = `E2E ohne JS ${Date.now()}`
    await page.getByLabel('الاسم').fill(name)
    await page.getByLabel('البريد الإلكتروني').fill('nojs@example.org')
    await page.getByLabel('الرسالة', { exact: true }).fill('E2E')
    await page.locator('#contact-consent').check()
    await humanPause(page)
    await page.getByRole('button', { name: 'إرسال الرسالة' }).click()
    await expect(page.locator('#write')).toContainText('وصلتنا رسالتك')
    await context.close()

    const [doc] = await findStored(request, 'contact-messages', 'name', name)
    expect(doc).toMatchObject({ locale: 'ar', consent: { text: expect.stringContaining('أوافق') } })
  })
})

test.describe('membership form', () => {
  const fillAdult = async (page: Page, lastName: string) => {
    await page.getByLabel('Vorname').fill('E2E')
    await page.getByLabel('Nachname').fill(lastName)
    await page.getByLabel('E-Mail', { exact: true }).fill('e2e-antrag@example.org')
    await page.getByLabel('Straße und Hausnummer').fill('Teststraße 1')
    await page.getByLabel('PLZ').fill('91052')
    await page.getByLabel('Ort').fill('Erlangen')
    await page.getByLabel('Land').fill('Deutschland')
    await page.getByLabel('Fördermitgliedschaft').check()
    await page.getByLabel('Ich bin mindestens 16 Jahre alt.').check()
    for (const name of ['principles', 'fees', 'consent']) {
      await page.locator(`#membership-${name}`).check()
    }
  }

  test('collects only the Satzung fields; guardian details only under 18', async ({
    page,
    request,
  }) => {
    await ownAddress(page)
    await page.goto('/mitglied-werden')
    const guardian = page.getByLabel('Name der erziehungsberechtigten Person')
    await expect(guardian).toBeHidden()
    const lastName = `Minderjährig ${Date.now()}`
    await fillAdult(page, lastName)
    await page.getByLabel('Ich bin unter 18 Jahre alt.').check()
    await expect(guardian).toBeVisible()

    await page.getByRole('button', { name: 'Antrag absenden' }).click()
    await expect(
      page.locator('[aria-labelledby="membership-errors-heading"]').getByRole('link'),
    ).toHaveText([
      'Name der erziehungsberechtigten Person: Bitte ausfüllen.',
      'E-Mail der erziehungsberechtigten Person: Bitte ausfüllen.',
    ])
    await guardian.fill('E2E Elternteil')
    await page.getByLabel('E-Mail der erziehungsberechtigten Person').fill('eltern@example.org')
    await humanPause(page)
    await page.getByRole('button', { name: 'Antrag absenden' }).click()
    await expect(page.getByRole('status')).toContainText('Ihr Antrag ist bei uns eingegangen')

    const [doc] = await findStored(request, 'membership-applications', 'lastName', lastName)
    expect(doc).toMatchObject({
      membershipType: 'supporting',
      under18: true,
      guardian: { name: 'E2E Elternteil', email: 'eltern@example.org' },
      declarations: { atLeast16: true, principles: true, fees: true },
      address: { postalCode: '91052', city: 'Erlangen' },
      status: 'received',
      locale: 'de',
      consent: { given: true },
    })
  })

  test('adults: no guardian details are stored, even if typed in before', async ({
    page,
    request,
  }) => {
    await ownAddress(page)
    await page.goto('/mitglied-werden')
    const lastName = `Volljährig ${Date.now()}`
    await fillAdult(page, lastName)
    await page.getByLabel('Ich bin unter 18 Jahre alt.').check()
    await page.getByLabel('Name der erziehungsberechtigten Person').fill('Should not be stored')
    await page.getByLabel('Ich bin unter 18 Jahre alt.').uncheck()
    await humanPause(page)
    await page.getByRole('button', { name: 'Antrag absenden' }).click()
    await expect(page.getByRole('status')).toContainText('Ihr Antrag ist bei uns eingegangen')

    const [doc] = await findStored(request, 'membership-applications', 'lastName', lastName)
    expect(doc).toMatchObject({ under18: false })
    expect(JSON.stringify(doc)).not.toContain('Should not be stored')
  })

  test('acceptance of an applicant under 18 needs the recorded guardian consent', async ({
    page,
    request,
  }) => {
    await ownAddress(page)
    await page.goto('/mitglied-werden')
    const lastName = `Zustimmung ${Date.now()}`
    await fillAdult(page, lastName)
    await page.getByLabel('Ich bin unter 18 Jahre alt.').check()
    await page.getByLabel('Name der erziehungsberechtigten Person').fill('E2E Elternteil')
    await page.getByLabel('E-Mail der erziehungsberechtigten Person').fill('eltern@example.org')
    await humanPause(page)
    await page.getByRole('button', { name: 'Antrag absenden' }).click()
    await expect(page.getByRole('status')).toContainText('Ihr Antrag ist bei uns eingegangen')

    const headers = await asBoard(request)
    const [doc] = await findStored(request, 'membership-applications', 'lastName', lastName)
    const update = (data: object) =>
      request.patch(adminUrl(`/api/membership-applications/${doc!.id}`), { headers, data })
    expect((await update({ status: 'accepted' })).status()).toBe(400)
    const accepted = await update({
      status: 'accepted',
      guardian: {
        name: 'E2E Elternteil',
        email: 'eltern@example.org',
        consentReceivedAt: '2026-10-19T10:00:00.000Z',
      },
    })
    expect(accepted.status()).toBe(200)
    const { doc: saved } = (await accepted.json()) as { doc: Record<string, unknown> }
    expect(saved.decisionDate).toBeTruthy()
    expect(saved.decidedBy).toBeTruthy()
    // Only super administrators may delete applications.
    expect(
      (
        await request.delete(adminUrl(`/api/membership-applications/${doc!.id}`), { headers })
      ).status(),
    ).toBe(403)
  })
})

test.describe('submissions are private', () => {
  test('visitors and editors can neither read nor create them through the API', async ({
    request,
  }) => {
    for (const collection of [
      'membership-applications',
      'contact-messages',
      'rate-limit-buckets',
    ]) {
      expect((await request.get(adminUrl(`/api/${collection}`))).status(), collection).toBe(403)
      expect(
        (await request.post(adminUrl(`/api/${collection}`), { data: { name: 'x' } })).status(),
        collection,
      ).toBe(403)
    }
    for (const role of ['contentEditor', 'technicalAdmin', 'auditor'] as const) {
      const headers = await authHeaders(request, role)
      for (const collection of ['membership-applications', 'contact-messages']) {
        expect(
          (await request.get(adminUrl(`/api/${collection}`), { headers })).status(),
          `${role} ${collection}`,
        ).toBe(403)
      }
    }
  })
})

test('the retention job deletes what is older than six months, and only that', async ({
  request,
}) => {
  const headers = await authHeaders(request, 'superAdmin')
  // Runs the jobs that are due in the queue (the fixtures queued one retention run).
  const run = await request.get(adminUrl('/api/payload-jobs/run?queue=maintenance'), { headers })
  expect(run.status()).toBe(200)

  const names = async (collection: string, field: string) =>
    (
      (await (
        await request.get(
          adminUrl(`/api/${collection}?where[${field}][like]=E2E Retention&limit=50&depth=0`),
          { headers },
        )
      ).json()) as { docs: Record<string, string>[] }
    ).docs
      .map((doc) => doc[field])
      .sort()
  expect(await names('contact-messages', 'name')).toEqual(['E2E Retention neu'])
  expect(await names('membership-applications', 'lastName')).toEqual([
    'E2E Retention abgelehnt neu',
    'E2E Retention aufgenommen alt',
  ])
})

test('pages with a form are not prefetched, and open when the link is followed', async ({
  page,
}) => {
  // They are rendered per request, so a prefetch would render them on the server for every
  // page view. A hanging prefetch of these pages once stalled every page load in CI.
  const prefetched: string[] = []
  page.on('request', (request) => {
    if (/\/(kontakt|mitglied-werden)\?_rsc=/.test(request.url())) prefetched.push(request.url())
  })
  await page.goto('/impressum', { waitUntil: 'networkidle' })
  expect(prefetched).toEqual([])
  await page
    .getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('link', { name: 'Kontakt' })
    .click()
  await expect(page).toHaveURL('/kontakt')
  await expect(page.getByRole('button', { name: 'Nachricht senden' })).toBeVisible()
})
