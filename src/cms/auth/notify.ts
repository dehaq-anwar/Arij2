import type { Payload } from 'payload'

import { adminUrl } from '@/lib/site'

type Notice =
  | { kind: 'enrolled' }
  | { kind: 'newDevice'; browser: string; os: string }
  | { kind: 'recoveryUsed'; left: number }
  | { kind: 'mfaReset' }
  | { kind: 'passwordChanged' }

const texts = (notice: Notice): [string, string, string] => {
  switch (notice.kind) {
    case 'enrolled':
      return [
        'Die Zwei-Faktor-Anmeldung für Ihr Konto wurde eingerichtet.',
        'Two-factor sign-in has been set up for your account.',
        'تم إعداد التحقق بخطوتين لحسابك.',
      ]
    case 'newDevice':
      return [
        `Neue Anmeldung an Ihrem Konto von einem bisher unbekannten Gerät (${notice.browser}, ${notice.os}).`,
        `New sign-in to your account from a device not seen before (${notice.browser}, ${notice.os}).`,
        `تسجيل دخول جديد إلى حسابك من جهاز غير معروف سابقًا (${notice.browser}، ${notice.os}).`,
      ]
    case 'recoveryUsed':
      return [
        `Für eine Anmeldung wurde ein Wiederherstellungscode verwendet. Verbleibende Codes: ${notice.left}.`,
        `A recovery code was used to sign in. Codes left: ${notice.left}.`,
        `استُخدم رمز استرداد لتسجيل الدخول. الرموز المتبقية: ${notice.left}.`,
      ]
    case 'mfaReset':
      return [
        'Eine Administratorin oder ein Administrator hat die Zwei-Faktor-Anmeldung Ihres Kontos zurückgesetzt. Bei der nächsten Anmeldung richten Sie sie neu ein.',
        'An administrator has reset two-factor sign-in for your account. You will set it up again at your next sign-in.',
        'أعاد أحد المسؤولين ضبط التحقق بخطوتين لحسابك. ستعيد إعداده عند تسجيل الدخول التالي.',
      ]
    case 'passwordChanged':
      return [
        'Das Passwort Ihres Kontos wurde geändert.',
        'The password of your account was changed.',
        'تم تغيير كلمة مرور حسابك.',
      ]
  }
}

/**
 * Security notices to the account itself, in all three languages. They name what happened and
 * when, nothing else (no address, no location). Without SMTP settings nothing is sent.
 */
export async function sendSecurityNotice(payload: Payload, to: string, notice: Notice) {
  const [de, en, ar] = texts(notice)
  const when = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
  try {
    await payload.sendEmail({
      to,
      subject: 'Youth of Peace – Sicherheitshinweis / Security notice / تنبيه أمني',
      text: [
        de,
        'Falls Sie das nicht waren, melden Sie sich sofort bei den Administrator:innen.',
        '',
        en,
        'If this was not you, contact the administrators immediately.',
        '',
        ar,
        'إن لم تكن أنت، فتواصل مع المسؤولين فورًا.',
        '',
        when,
        `${adminUrl()}/admin/security`,
      ].join('\n'),
    })
  } catch (error) {
    payload.logger.warn({ code: (error as { code?: string }).code }, 'Security notice not sent')
  }
}
