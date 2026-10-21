import type { Access, GlobalConfig } from 'payload'

import { can, type PermissionSubject } from '../access/permissions'
import { allow, allowed } from '../access/roles'
import { groups, label } from '../lib/labels'

/** Only `settings.manage` reads and changes these settings. */
const readSettings: Access = ({ req }) => allowed(req, 'settings.manage')

/**
 * Settings of the Control Center that the association manages without code: reminder periods
 * for open applications. (What personal data may be exported for, and on which legal basis, is
 * managed in the collections processing-purposes and legal-bases.)
 */
export const ControlCenterSettings: GlobalConfig = {
  slug: 'control-center-settings',
  label: label('Einstellungen', 'Settings', 'الإعدادات'),
  admin: {
    group: groups.admin,
    hidden: ({ user }) => !can(user as PermissionSubject, 'settings.manage'),
    description: label(
      'Erinnerungen. Änderungen werden im Audit-Log festgehalten.',
      'Reminders. Changes are recorded in the audit log.',
      'التذكيرات. تُسجَّل التغييرات في سجل العمليات.',
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
            {
              name: 'memberReviewDays',
              type: 'number',
              required: true,
              defaultValue: 0,
              min: 0,
              max: 365,
              label: label(
                'Prüfung nach Ende der Mitgliedschaft (Tage)',
                'Review after a membership ends (days)',
                'المراجعة بعد انتهاء العضوية (أيام)',
              ),
              admin: {
                description: label(
                  'So viele Tage nach dem Ende ist der Eintrag zur Prüfung fällig (0 = sofort): was gelöscht wird und was aus welchem Grund wie lange bleibt.',
                  'This many days after the end the entry is due for review (0 = at once): what is deleted and what is kept, why and how long.',
                  'بعد هذا العدد من الأيام من الانتهاء يحين موعد مراجعة الإدخال (0 = فورًا): ما يُحذف وما يُحفظ ولماذا وإلى متى.',
                ),
              },
            },
          ],
        },
      ],
    },
  ],
}
