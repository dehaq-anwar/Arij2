import type { Field } from 'payload'

import { hasRole } from '../access/roles'
import { label } from '../lib/labels'

/** Applications and messages are hidden from the admin navigation of editors. */
export const hiddenUnlessBoard = ({ user }: { user: unknown }) =>
  !hasRole(user as Parameters<typeof hasRole>[0], 'admin', 'board')

/** What the person submitted is a record: shown, but not editable in the admin. */
export const submitted = { readOnly: true } as const

/**
 * The record of consent (GDPR Art. 7(1)): when it was given, which version of the privacy policy
 * applied and the exact wording of the checkbox the person ticked.
 */
export const consentRecord: Field = {
  name: 'consent',
  type: 'group',
  label: label('Einwilligung', 'Consent', 'الموافقة'),
  admin: submitted,
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'given',
          type: 'checkbox',
          required: true,
          label: label('Erteilt', 'Given', 'مُنحت'),
        },
        {
          name: 'at',
          type: 'date',
          required: true,
          label: label('Zeitpunkt', 'Date and time', 'التاريخ والوقت'),
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'privacyPolicyVersion',
          type: 'text',
          label: label(
            'Version der Datenschutzerklärung',
            'Privacy policy version',
            'إصدار سياسة الخصوصية',
          ),
        },
      ],
    },
    {
      name: 'text',
      type: 'textarea',
      label: label('Wortlaut', 'Wording', 'النص'),
    },
  ],
}

export const submittedLocale: Field = {
  name: 'locale',
  type: 'select',
  required: true,
  label: label('Sprache des Formulars', 'Form language', 'لغة النموذج'),
  options: [
    { value: 'de', label: 'Deutsch' },
    { value: 'en', label: 'English' },
    { value: 'ar', label: 'العربية' },
  ],
  admin: { ...submitted, position: 'sidebar' },
}
