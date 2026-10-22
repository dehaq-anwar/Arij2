/**
 * Every e-mail the website and the Control Center send (docs/CONTROL-CENTER.md §6), in one
 * place, so that the preview in the Control Center shows exactly what goes out. They are in
 * German, English and Arabic together and carry no personal data from forms: a notice, a link.
 */
export const TEMPLATES = [
  'newApplication',
  'newMessage',
  'passwordReset',
  'securityNotice',
  'alert',
  'test',
] as const
export type Template = (typeof TEMPLATES)[number]

/** Internal header naming the template for the delivery log; removed before sending. */
export const TEMPLATE_HEADER = 'X-YOP-Template'

export type Rendered = { subject: string; text: string; html?: string }

const escape = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

export const PASSWORD_RESET_SUBJECT =
  'Youth of Peace – Passwort zurücksetzen / Reset password / إعادة تعيين كلمة المرور'

export function newSubmissionMail(
  collection: 'membership-applications' | 'contact-messages',
  link: string,
): Rendered {
  return {
    subject:
      collection === 'membership-applications'
        ? 'Neuer Mitgliedsantrag / New membership application / طلب عضوية جديد'
        : 'Neue Kontaktnachricht / New contact message / رسالة تواصل جديدة',
    text: [
      'Über die Website ist ein neuer Eintrag eingegangen. / A new entry arrived via the website. / وصل إدخال جديد عبر الموقع.',
      '',
      link,
      '',
      'Diese E-Mail enthält bewusst keine Angaben zur Person. / This e-mail deliberately contains no personal data. / لا تحتوي هذه الرسالة عمدًا على بيانات شخصية.',
    ].join('\n'),
  }
}

export function passwordResetMail(link: string): Rendered {
  const safe = escape(link)
  return {
    subject: PASSWORD_RESET_SUBJECT,
    text: [
      'Sie können ein neues Passwort für Ihr Konto im Youth of Peace Control Center festlegen. Der Link gilt eine Stunde.',
      'You can set a new password for your Youth of Peace Control Center account. The link is valid for one hour.',
      'يمكنك تعيين كلمة مرور جديدة لحسابك في مركز التحكم. الرابط صالح لمدة ساعة.',
      '',
      link,
      '',
      'Falls Sie das nicht angefordert haben, ignorieren Sie diese E-Mail. / If you did not ask for this, ignore this e-mail. / إن لم تطلب ذلك فتجاهل هذه الرسالة.',
    ].join('\n'),
    html: [
      '<p>Sie können ein neues Passwort für Ihr Konto im Youth of Peace Control Center festlegen. Der Link gilt eine Stunde.</p>',
      '<p>You can set a new password for your Youth of Peace Control Center account. The link is valid for one hour.</p>',
      '<p dir="rtl">يمكنك تعيين كلمة مرور جديدة لحسابك في مركز التحكم. الرابط صالح لمدة ساعة.</p>',
      `<p><a href="${safe}">${safe}</a></p>`,
      '<p>Falls Sie das nicht angefordert haben, ignorieren Sie diese E-Mail. / If you did not ask for this, ignore this e-mail. / إن لم تطلب ذلك فتجاهل هذه الرسالة.</p>',
    ].join('\n'),
  }
}

export type SecurityNotice =
  | { kind: 'enrolled' }
  | { kind: 'newDevice'; browser: string; os: string }
  | { kind: 'recoveryUsed'; left: number }
  | { kind: 'mfaReset' }
  | { kind: 'passwordChanged' }

const securityTexts = (notice: SecurityNotice): [string, string, string] => {
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

/** Security notices to the account itself: what happened and when, nothing else. */
export function securityNoticeMail(notice: SecurityNotice, when: string, link: string): Rendered {
  const [de, en, ar] = securityTexts(notice)
  return {
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
      link,
    ].join('\n'),
  }
}

export function alertMail(
  texts: [string, string, string],
  subject: string,
  link: string,
): Rendered {
  const [de, en, ar] = texts
  return {
    subject: `Youth of Peace – Technische Warnung / Technical warning / تنبيه تقني: ${subject}`,
    text: [`${de} (${subject})`, `${en} (${subject})`, `${ar} (${subject})`, '', link].join('\n'),
  }
}

export function testMail(when: string, link: string): Rendered {
  return {
    subject: 'Youth of Peace – Test-E-Mail / Test e-mail / رسالة تجريبية',
    text: [
      'Diese Test-E-Mail wurde im Control Center angefordert. Der Versand funktioniert.',
      'This test e-mail was requested in the Control Center. Sending works.',
      'طُلبت هذه الرسالة التجريبية من مركز التحكم. الإرسال يعمل.',
      '',
      when,
      link,
    ].join('\n'),
  }
}

/** Time of sending in the association's time zone, for the texts. */
export const mailTime = (now = new Date()) =>
  `${new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(now)} (Europe/Berlin)`
