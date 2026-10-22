import type { Payload } from 'payload'

import { adminUrl } from '@/lib/site'

import { securityNoticeMail, TEMPLATE_HEADER, type SecurityNotice } from '../mail/templates'

/**
 * Security notices to the account itself, in all three languages. They name what happened and
 * when, nothing else (no address, no location). Without SMTP settings nothing is sent.
 */
export async function sendSecurityNotice(payload: Payload, to: string, notice: SecurityNotice) {
  const when = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
  const mail = securityNoticeMail(notice, when, `${adminUrl()}/admin/security`)
  try {
    await payload.sendEmail({
      to,
      subject: mail.subject,
      text: mail.text,
      headers: { [TEMPLATE_HEADER]: 'securityNotice' },
    })
  } catch (error) {
    payload.logger.warn({ code: (error as { code?: string }).code }, 'Security notice not sent')
  }
}
