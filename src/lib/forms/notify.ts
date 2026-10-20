import type { Payload } from 'payload'

import { adminUrl } from '@/lib/site'

const subjects = {
  'membership-applications': 'Neuer Mitgliedsantrag / New membership application',
  'contact-messages': 'Neue Kontaktnachricht / New contact message',
} as const

/**
 * Tells the association (NOTIFY_EMAIL, e.g. info@yop-ye.org) that something arrived. The e-mail
 * deliberately contains no personal data, only a link to the entry in the CMS.
 */
export async function notifyNewSubmission(
  payload: Payload,
  collection: keyof typeof subjects,
  id: number | string,
) {
  const to = process.env.NOTIFY_EMAIL
  if (!to) return
  const link = `${adminUrl()}/admin/collections/${collection}/${id}`
  try {
    await payload.sendEmail({
      to,
      subject: subjects[collection],
      text: [
        'Über die Website ist ein neuer Eintrag eingegangen. / A new entry arrived via the website.',
        '',
        link,
        '',
        'Diese E-Mail enthält bewusst keine Angaben zur Person. / This e-mail deliberately contains no personal data.',
      ].join('\n'),
    })
  } catch (error) {
    payload.logger.warn({ code: (error as { code?: string }).code }, 'Notification e-mail failed')
  }
}
