import { label } from '../lib/labels'
import { pageGlobal } from './shared'

export const HomePage = pageGlobal({
  slug: 'home-page',
  label: label('Startseite', 'Home page', 'الصفحة الرئيسية'),
  fields: [
    {
      name: 'hero',
      type: 'group',
      label: label('Kopfbereich', 'Hero', 'الواجهة'),
      fields: [
        {
          name: 'headline',
          type: 'text',
          required: true,
          localized: true,
          label: label('Überschrift', 'Headline', 'العنوان الرئيسي'),
        },
        {
          name: 'subline',
          type: 'textarea',
          localized: true,
          label: label('Unterzeile', 'Subline', 'السطر التالي'),
        },
      ],
    },
    {
      name: 'mission',
      type: 'textarea',
      localized: true,
      maxLength: 240,
      label: label('Mission in einem Satz', 'Mission in one sentence', 'الرسالة في جملة واحدة'),
    },
    {
      name: 'focusIntro',
      type: 'textarea',
      localized: true,
      label: label('Einleitung Schwerpunkte', 'Focus areas intro', 'مقدمة مجالات العمل'),
    },
    {
      name: 'statsHeading',
      type: 'text',
      localized: true,
      label: label('Überschrift Kennzahlen', 'Statistics heading', 'عنوان الأرقام'),
      admin: {
        description: label(
          'Der Bereich erscheint nur, wenn Kennzahlen gepflegt sind.',
          'The section only appears when statistics exist.',
          'يظهر هذا القسم فقط عند وجود أرقام.',
        ),
      },
    },
    {
      name: 'cta',
      type: 'group',
      label: label('Aufruf zum Mitmachen', 'Call to action', 'دعوة للمشاركة'),
      fields: [
        {
          name: 'heading',
          type: 'text',
          localized: true,
          label: label('Überschrift', 'Heading', 'العنوان'),
        },
        { name: 'text', type: 'textarea', localized: true, label: label('Text', 'Text', 'النص') },
      ],
    },
  ],
})
