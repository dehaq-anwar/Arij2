import { DAY_PICKER } from '../fields/date'
import { label } from '../lib/labels'
import { pageGlobal } from './shared'

const legalFields = [
  {
    name: 'content',
    type: 'richText' as const,
    localized: true,
    label: label('Text', 'Text', 'النص'),
  },
  {
    name: 'lastUpdated',
    type: 'date' as const,
    label: label('Stand', 'Last updated', 'آخر تحديث'),
    admin: { date: DAY_PICKER },
  },
]

export const LegalNotice = pageGlobal({
  slug: 'legal-notice',
  // Every saved wording stays as a version (who changed what, when; restorable).
  versions: { max: 100 },
  label: label('Impressum', 'Legal notice', 'الإشعار القانوني'),
  admin: {
    description: label(
      'Pflichtangaben nach § 5 DDG. Den Text liefert der Verein (rechtlich prüfen lassen).',
      'Mandatory information under § 5 DDG. The text is supplied by the association (have it legally reviewed).',
      'بيانات إلزامية وفق § 5 DDG. تقدّم الجمعية النص (مع مراجعة قانونية).',
    ),
  },
  fields: legalFields,
})

export const PrivacyPolicy = pageGlobal({
  slug: 'privacy-policy',
  // Every saved wording stays as a version (who changed what, when; restorable).
  versions: { max: 100 },
  label: label('Datenschutzerklärung', 'Privacy policy', 'سياسة الخصوصية'),
  admin: {
    description: label(
      'Den Text liefert der Verein. Technische Fakten zur Website: docs/privacy-notes.md.',
      'The text is supplied by the association. Technical facts about the website: docs/privacy-notes.md.',
      'تقدّم الجمعية النص. الحقائق التقنية عن الموقع في docs/privacy-notes.md.',
    ),
  },
  fields: [
    ...legalFields,
    {
      name: 'version',
      type: 'text',
      label: label('Version', 'Version', 'الإصدار'),
      admin: {
        description: label(
          'Wird bei jeder Einwilligung in Formularen mitgespeichert.',
          'Stored with every consent given in forms.',
          'يُحفظ مع كل موافقة في النماذج.',
        ),
      },
    },
  ],
})
