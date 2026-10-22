import type { Endpoint, PayloadRequest } from 'payload'

import { adminUrl } from '@/lib/site'

import { can, type PermissionSubject } from '../access/permissions'
import { audit } from '../audit/log'
import { isVerifiedSession } from '../auth/session-state'
import { checkDomain } from './dns'
import { mailSettings } from './settings'
import { mailTime, TEMPLATE_HEADER, testMail } from './templates'

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

/** At most five test e-mails per person and hour. */
export const TEST_MAILS_PER_HOUR = 5

async function guard(req: PayloadRequest) {
  if (!req.user || !(await isVerifiedSession(req))) return json({ error: 'not_signed_in' }, 401)
  if (!can(req.user as unknown as PermissionSubject, 'email.manage')) {
    return json({ error: 'not_allowed' }, 403)
  }
  return null
}

/**
 * POST /api/email/test — a test e-mail through the real transport, only ever to the signed-in
 * person's own address; result and error code shown and in the audit log.
 */
async function sendTest(req: PayloadRequest) {
  const refused = await guard(req)
  if (refused) return refused
  const user = req.user as unknown as { id: number; email: string }
  const settings = await mailSettings(req.payload)
  if (!settings.host || !settings.fromAddress) return json({ error: 'not_configured' }, 409)
  const recent = await req.payload.count({
    collection: 'audit-log',
    where: {
      and: [
        { action: { equals: 'email.test' } },
        { actorId: { equals: user.id } },
        { createdAt: { greater_than: new Date(Date.now() - 3_600_000).toISOString() } },
      ],
    },
    overrideAccess: true,
  })
  if (recent.totalDocs >= TEST_MAILS_PER_HOUR) return json({ error: 'too_many' }, 429)
  const mail = testMail(mailTime(), `${adminUrl()}/admin/email`)
  try {
    await req.payload.sendEmail({
      to: user.email,
      subject: mail.subject,
      text: mail.text,
      headers: { [TEMPLATE_HEADER]: 'test' },
    })
  } catch (error) {
    const e = error as { code?: unknown; responseCode?: unknown }
    const code = [e.code, e.responseCode].filter(Boolean).join(' ').slice(0, 60) || 'ERROR'
    await audit(
      req.payload,
      { action: 'email.test', area: 'operations', result: 'failed', detail: { code } },
      req,
    )
    return json({ error: 'failed', code }, 502)
  }
  await audit(req.payload, { action: 'email.test', area: 'operations' }, req)
  return json({ sent: true, to: user.email })
}

/** GET /api/email/dns — MX, SPF, DKIM and DMARC of the sender's domain, looked up now. */
async function dns(req: PayloadRequest) {
  const refused = await guard(req)
  if (refused) return refused
  const settings = await mailSettings(req.payload)
  if (!settings.domain) return json({ error: 'no_domain' }, 409)
  const results = await checkDomain(settings.domain, settings.dkimSelector)
  return json({ domain: settings.domain, selector: settings.dkimSelector, results })
}

export const mailEndpoints: Endpoint[] = [
  { path: '/email/test', method: 'post', handler: sendTest },
  { path: '/email/dns', method: 'get', handler: dns },
]
