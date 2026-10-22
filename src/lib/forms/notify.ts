import type { Payload } from 'payload'

import { mailSettings } from '@/cms/mail/settings'
import { newSubmissionMail, TEMPLATE_HEADER } from '@/cms/mail/templates'
import { adminHref, notify, recipientsWith } from '@/cms/membership/notifications'
import { adminUrl } from '@/lib/site'

/**
 * Tells the association (the notification address in the e-mail settings, else NOTIFY_EMAIL,
 * e.g. info@yop-ye.org) that something arrived. The e-mail deliberately contains no personal
 * data, only a link to the entry in the CMS.
 */
export async function notifyNewSubmission(
  payload: Payload,
  collection: 'membership-applications' | 'contact-messages',
  id: number | string,
) {
  // In the Control Center: everyone who works on applications and messages (no personal data).
  try {
    await notify(payload, {
      kind: collection === 'membership-applications' ? 'newApplication' : 'newMessage',
      recipients: await recipientsWith(payload, 'inbox.read'),
      subjectType: collection,
      subjectId: id,
      href: adminHref(collection, id),
    })
  } catch (error) {
    payload.logger.warn({ err: error }, 'In-app notification failed')
  }
  const to = (await mailSettings(payload)).notifyAddress
  if (!to) return
  const mail = newSubmissionMail(collection, `${adminUrl()}/admin/collections/${collection}/${id}`)
  try {
    await payload.sendEmail({
      to,
      subject: mail.subject,
      text: mail.text,
      headers: {
        [TEMPLATE_HEADER]:
          collection === 'membership-applications' ? 'newApplication' : 'newMessage',
      },
    })
  } catch (error) {
    payload.logger.warn({ code: (error as { code?: string }).code }, 'Notification e-mail failed')
  }
}
