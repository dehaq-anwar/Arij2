import type { Access, GlobalConfig } from 'payload'

import { can, type PermissionSubject } from '../access/permissions'
import { allow, allowed } from '../access/roles'
import { groups, label } from '../lib/labels'

/** Those who export need the list of legal bases; only `settings.manage` changes anything. */
const readSettings: Access = async ({ req }) =>
  (await allowed(req, 'settings.manage')) || (await allowed(req, 'personalData.export'))

/**
 * Settings of the Control Center that the association manages without code: reminder periods
 * for open applications, and the legal bases a person can choose from when exporting personal
 * data. The list of legal bases starts empty on purpose: which bases apply is for the
 * association to decide (docs/CONTROL-CENTER.md §5); until it is filled in, exports are refused.
 */
export const ControlCenterSettings: GlobalConfig = {
  slug: 'control-center-settings',
  label: label('Einstellungen', 'Settings', 'الإعدادات'),
  admin: {
    group: groups.admin,
    hidden: ({ user }) => !can(user as PermissionSubject, 'settings.manage'),
    description: label(
      'Erinnerungen und Export. Änderungen werden im Audit-Log festgehalten.',
      'Reminders and exports. Changes are recorded in the audit log.',
      'التذكيرات والتصدير. تُسجَّل التغييرات في سجل العمليات.',
    ),
  },
  access: { read: readSettings, update: allow('settings.manage') },
  fields: [
    {
      name: 'reminders',
      type: 'group',
      label: label('Erinnerungen', 'Reminders', 'التذكيرات'),
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'waitingDays',
              type: 'number',
              required: true,
              defaultValue: 7,
              min: 1,
              max: 90,
              label: label(
                'Antrag ohne Bearbeitung nach (Tagen)',
                'Application untouched after (days)',
                'طلب دون معالجة بعد (أيام)',
              ),
              admin: {
                description: label(
                  'Eingegangene Anträge, die so lange nicht bearbeitet wurden, lösen eine Erinnerung aus.',
                  'Received applications not worked on for this long trigger a reminder.',
                  'الطلبات الواردة التي لم تُعالج طوال هذه المدة تُطلق تذكيرًا.',
                ),
              },
            },
            {
              name: 'consentDays',
              type: 'number',
              required: true,
              defaultValue: 14,
              min: 1,
              max: 180,
              label: label(
                'Zustimmung ausstehend nach (Tagen)',
                'Consent pending after (days)',
                'الموافقة معلّقة بعد (أيام)',
              ),
              admin: {
                description: label(
                  'Anträge unter 18, bei denen so lange keine Zustimmung eingetragen ist, lösen eine Erinnerung aus.',
                  'Applications of people under 18 without a recorded consent for this long trigger a reminder.',
                  'طلبات من هم دون 18 عامًا دون موافقة مسجّلة طوال هذه المدة تُطلق تذكيرًا.',
                ),
              },
            },
          ],
        },
      ],
    },
    {
      name: 'exportLegalBases',
      type: 'array',
      label: label(
        'Rechtsgrundlagen für Exporte',
        'Legal bases for exports',
        'الأسس القانونية للتصدير',
      ),
      labels: {
        singular: label('Rechtsgrundlage', 'Legal basis', 'أساس قانوني'),
        plural: label('Rechtsgrundlagen', 'Legal bases', 'الأسس القانونية'),
      },
      admin: {
        description: label(
          'Vom Verein festzulegen. Beim Export wählt die Person eine davon aus; ohne Eintrag ist kein Export möglich.',
          'To be set by the association. Whoever exports chooses one of them; without an entry, exporting is not possible.',
          'تحددها الجمعية. يختار من يصدّر البيانات واحدًا منها؛ ولا يمكن التصدير دون إدخال.',
        ),
      },
      fields: [
        {
          name: 'de',
          type: 'text',
          required: true,
          maxLength: 200,
          label: label('Deutsch', 'German', 'الألمانية'),
        },
        {
          type: 'row',
          fields: [
            {
              name: 'en',
              type: 'text',
              maxLength: 200,
              label: label('Englisch', 'English', 'الإنجليزية'),
            },
            {
              name: 'ar',
              type: 'text',
              maxLength: 200,
              label: label('Arabisch', 'Arabic', 'العربية'),
            },
          ],
        },
      ],
    },
  ],
}
