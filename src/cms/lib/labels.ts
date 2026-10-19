import type { PayloadRequest } from 'payload'

/** Admin UI text in the three admin languages. */
export type AdminLabel = { de: string; en: string; ar: string }

export const label = (de: string, en: string, ar: string): AdminLabel => ({ de, en, ar })

/** Pick the message for the admin user's current UI language (falls back to German). */
export const localizedMessage = (message: AdminLabel, req: PayloadRequest): string => {
  const language = req.i18n?.language
  return language === 'en' || language === 'ar' ? message[language] : message.de
}

export const groups = {
  content: label('Inhalte', 'Content', 'المحتوى'),
  pages: label('Seiten', 'Pages', 'الصفحات'),
  inbox: label('Eingänge', 'Inbox', 'الوارد'),
  settings: label('Einstellungen', 'Settings', 'الإعدادات'),
  admin: label('Verwaltung', 'Administration', 'الإدارة'),
}
