import { label } from '../lib/labels'
import { pageGlobal } from './shared'

export const MembershipPage = pageGlobal({
  slug: 'membership-page',
  label: label('Mitglied werden', 'Membership', 'العضوية'),
  fields: [
    {
      name: 'intro',
      type: 'richText',
      localized: true,
      label: label('Einleitung', 'Introduction', 'المقدمة'),
    },
    {
      name: 'whoCanJoin',
      type: 'richText',
      localized: true,
      label: label('Wer Mitglied werden kann', 'Who can join', 'من يمكنه الانضمام'),
    },
    {
      name: 'fees',
      type: 'richText',
      localized: true,
      label: label('Beiträge', 'Fees', 'الاشتراكات'),
      admin: {
        description: label(
          'Ohne Beträge (Beschluss des Vereins).',
          'Without amounts (decision of the association).',
          'دون مبالغ (بقرار من الجمعية).',
        ),
      },
    },
    {
      name: 'process',
      type: 'richText',
      localized: true,
      label: label('Ablauf', 'Process', 'خطوات الانضمام'),
    },
    {
      name: 'formNote',
      type: 'textarea',
      localized: true,
      label: label(
        'Hinweis zum Antragsformular',
        'Note about the application form',
        'ملاحظة حول نموذج الطلب',
      ),
    },
  ],
})
