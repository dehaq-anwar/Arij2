import type { Payload, PayloadRequest } from 'payload'

import { adminUrl } from '@/lib/site'

import { alertMail, TEMPLATE_HEADER } from '../mail/templates'
import { mailSettings } from '../mail/settings'
import type { OperationsAlert, OperationsAlertKind } from './alerts'

/** The warning's wording in German, English and Arabic (also the bell's, src/cms/admin/i18n). */
export const ALERT_TEXTS: Record<OperationsAlertKind, [string, string, string]> = {
  opsAgentUnreachable: [
    'Der Betriebs-Agent antwortet seit mindestens 15 Minuten nicht.',
    'The operations agent has not answered for at least 15 minutes.',
    'وكيل التشغيل لا يستجيب منذ 15 دقيقة على الأقل.',
  ],
  opsServiceDown: [
    'Ein Dienst läuft nicht oder meldet einen Fehler.',
    'A service is not running or reports a problem.',
    'خدمة لا تعمل أو تُبلغ عن مشكلة.',
  ],
  opsBackupFailed: ['Eine Sicherung ist fehlgeschlagen.', 'A backup failed.', 'فشل نسخ احتياطي.'],
  opsBackupOverdue: [
    'Seit über 26 Stunden gibt es keine erfolgreiche Sicherung.',
    'There has been no successful backup for more than 26 hours.',
    'لا يوجد نسخ احتياطي ناجح منذ أكثر من 26 ساعة.',
  ],
  opsDrillFailed: [
    'Eine Test-Wiederherstellung ist fehlgeschlagen.',
    'A restore drill failed.',
    'فشل اختبار الاستعادة.',
  ],
  opsRestartFailed: ['Ein Neustart ist fehlgeschlagen.', 'A restart failed.', 'فشلت إعادة تشغيل.'],
  opsCertificate: [
    'Ein TLS-Zertifikat läuft bald ab oder ist ungültig.',
    'A TLS certificate expires soon or is not valid.',
    'شهادة TLS على وشك الانتهاء أو غير صالحة.',
  ],
  opsDiskFull: [
    'Der Speicher des Servers ist zu über 90 % belegt.',
    'The server’s disk is more than 90 % full.',
    'قرص الخادم ممتلئ بأكثر من 90 %.',
  ],
}

/**
 * Sends the warning to the technical address (e-mail settings), if one is set. The e-mail names
 * what it is about and links to the Control Center; logs and details stay there.
 */
export async function sendOperationsAlertEmail(
  payload: Payload,
  alert: OperationsAlert,
  _req?: PayloadRequest,
) {
  const settings = await mailSettings(payload)
  if (!settings.technicalAddress || !settings.host) return false
  const mail = alertMail(ALERT_TEXTS[alert.kind], alert.subject, `${adminUrl()}${alert.href}`)
  try {
    await payload.sendEmail({
      to: settings.technicalAddress,
      subject: mail.subject,
      text: mail.text,
      headers: { [TEMPLATE_HEADER]: 'alert' },
    })
    return true
  } catch {
    // Recorded in the delivery log by the e-mail adapter.
    return false
  }
}
