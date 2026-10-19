import { label } from '../lib/labels'
import { formText, pageGlobal } from './shared'

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
    {
      name: 'form',
      type: 'group',
      label: label('Texte im Antragsformular', 'Texts in the application form', 'نصوص نموذج الطلب'),
      admin: {
        description: label(
          'Wortlaut der Erklärungen, die Antragstellende ankreuzen. Er wird mit jedem Antrag gespeichert. Bitte rechtlich prüfen lassen.',
          'Wording of the declarations applicants tick. It is stored with every application. Please have it legally reviewed.',
          'نص الإقرارات التي يؤشر عليها مقدمو الطلبات، ويُحفظ مع كل طلب. يُرجى مراجعته قانونيًا.',
        ),
      },
      fields: [
        formText(
          'principles',
          label('Grundsätze und Ziele', 'Principles and aims', 'المبادئ والأهداف'),
        ),
        formText('fees', label('Beiträge', 'Fees', 'الاشتراكات')),
        formText(
          'guardian',
          label(
            'Hinweis für Antragstellende unter 18',
            'Note for applicants under 18',
            'ملاحظة لمن هم دون 18 عامًا',
          ),
        ),
        formText(
          'consent',
          label('Einwilligung (Datenschutz)', 'Consent (privacy)', 'الموافقة (الخصوصية)'),
        ),
      ],
    },
  ],
})
