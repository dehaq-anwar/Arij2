import type { AdminLanguage } from '../i18n'

type Three = [de: string, en: string, ar: string]

/** Readable names for the audit log's action keys (src/cms/audit, src/cms/auth). */
const ACTIONS: Record<string, Three> = {
  'auth.login': ['Anmeldung', 'Signed in', 'تسجيل دخول'],
  'auth.logout': ['Abmeldung', 'Signed out', 'تسجيل خروج'],
  'auth.password_failed': ['Falsches Passwort', 'Wrong password', 'كلمة مرور خاطئة'],
  'auth.account_locked': [
    'Konto vorübergehend gesperrt',
    'Account temporarily locked',
    'قفل الحساب مؤقتًا',
  ],
  'auth.mfa_failed': ['Falscher Bestätigungscode', 'Wrong verification code', 'رمز تحقق خاطئ'],
  'auth.mfa_locked': [
    'Zwei-Faktor gesperrt (zu viele Fehler)',
    'Two-factor locked (too many errors)',
    'قفل التحقق بخطوتين (أخطاء كثيرة)',
  ],
  'auth.mfa_enrolled': ['Zwei-Faktor eingerichtet', 'Two-factor set up', 'إعداد التحقق بخطوتين'],
  'auth.recovery_code_used': [
    'Wiederherstellungscode verwendet',
    'Recovery code used',
    'استخدام رمز استرداد',
  ],
  'auth.recovery_codes_regenerated': [
    'Neue Wiederherstellungscodes',
    'New recovery codes',
    'رموز استرداد جديدة',
  ],
  'auth.step_up': ['Mit Code bestätigt', 'Confirmed with code', 'تأكيد برمز'],
  'auth.step_up_failed': ['Bestätigung fehlgeschlagen', 'Confirmation failed', 'فشل التأكيد'],
  'auth.session_revoked': ['Sitzung abgemeldet', 'Session signed out', 'إنهاء جلسة'],
  'auth.new_device': [
    'Anmeldung von neuem Gerät',
    'Sign-in from a new device',
    'دخول من جهاز جديد',
  ],
  'users.reset-mfa': ['Zwei-Faktor zurückgesetzt', 'Two-factor reset', 'إعادة ضبط التحقق بخطوتين'],
  'users.end-sessions': ['Alle Sitzungen beendet', 'All sessions ended', 'إنهاء كل الجلسات'],
}

const OPERATIONS: Record<string, Three> = {
  create: ['angelegt', 'created', 'إنشاء'],
  update: ['geändert', 'changed', 'تعديل'],
  delete: ['gelöscht', 'deleted', 'حذف'],
}

const SUBJECTS: Record<string, Three> = {
  users: ['Konto', 'Account', 'حساب'],
  projects: ['Projekt', 'Project', 'مشروع'],
  news: ['Beitrag', 'Post', 'خبر'],
  'focus-areas': ['Schwerpunkt', 'Focus area', 'مجال عمل'],
  'team-members': ['Teammitglied', 'Team member', 'عضو فريق'],
  statistics: ['Kennzahl', 'Figure', 'إحصائية'],
  partners: ['Partner', 'Partner', 'شريك'],
  media: ['Medium', 'Media file', 'ملف وسائط'],
  'membership-applications': ['Mitgliedsantrag', 'Membership application', 'طلب عضوية'],
  'contact-messages': ['Kontaktnachricht', 'Contact message', 'رسالة تواصل'],
  'home-page': ['Startseite', 'Home page', 'الصفحة الرئيسية'],
  'about-page': ['Seite „Über uns“', 'About page', 'صفحة من نحن'],
  'membership-page': ['Seite „Mitglied werden“', 'Membership page', 'صفحة العضوية'],
  'support-page': ['Seite „Unterstützen“', 'Support page', 'صفحة الدعم'],
  'contact-page': ['Seite „Kontakt“', 'Contact page', 'صفحة التواصل'],
  'legal-notice': ['Impressum', 'Legal notice', 'بيانات النشر'],
  'privacy-policy': ['Datenschutzerklärung', 'Privacy policy', 'سياسة الخصوصية'],
  'site-settings': ['Website-Einstellungen', 'Site settings', 'إعدادات الموقع'],
}

const pick = (three: Three, language: AdminLanguage) =>
  three[language === 'en' ? 1 : language === 'ar' ? 2 : 0]

export function actionLabel(action: string, language: AdminLanguage): string {
  const fixed = ACTIONS[action]
  if (fixed) return pick(fixed, language)
  const dot = action.lastIndexOf('.')
  const subject = SUBJECTS[action.slice(0, dot)]
  const operation = OPERATIONS[action.slice(dot + 1)]
  if (!subject || !operation) return action
  return language === 'ar'
    ? `${pick(operation, language)} ${pick(subject, language)}`
    : `${pick(subject, language)} ${pick(operation, language)}`
}
