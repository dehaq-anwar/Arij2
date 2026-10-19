import { label } from '../lib/labels'
import { pageGlobal } from './shared'

export const AboutPage = pageGlobal({
  slug: 'about-page',
  label: label('Über uns', 'About us', 'من نحن'),
  fields: [
    {
      name: 'mission',
      type: 'textarea',
      localized: true,
      maxLength: 240,
      label: label('Mission in einem Satz', 'Mission in one sentence', 'الرسالة في جملة واحدة'),
    },
    {
      name: 'intro',
      type: 'richText',
      localized: true,
      label: label('Einleitung', 'Introduction', 'المقدمة'),
    },
    {
      name: 'story',
      type: 'array',
      label: label('Geschichte (Zeitleiste)', 'Story (timeline)', 'القصة (خط زمني)'),
      fields: [
        { name: 'year', type: 'number', label: label('Jahr', 'Year', 'السنة') },
        {
          name: 'title',
          type: 'text',
          required: true,
          localized: true,
          label: label('Titel', 'Title', 'العنوان'),
        },
        { name: 'text', type: 'textarea', localized: true, label: label('Text', 'Text', 'النص') },
      ],
    },
    {
      name: 'values',
      type: 'array',
      label: label('Werte', 'Values', 'القيم'),
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          localized: true,
          label: label('Titel', 'Title', 'العنوان'),
        },
        {
          name: 'description',
          type: 'textarea',
          localized: true,
          label: label('Beschreibung', 'Description', 'الوصف'),
        },
      ],
    },
    {
      name: 'boardIntro',
      type: 'textarea',
      localized: true,
      label: label('Einleitung Vorstand', 'Board intro', 'مقدمة مجلس الإدارة'),
    },
  ],
})
