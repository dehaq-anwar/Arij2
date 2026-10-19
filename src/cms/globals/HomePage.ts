import { label } from '../lib/labels'
import { pageGlobal } from './shared'

/**
 * The home page shows little text by design: the name, the tagline (site settings), a short
 * journey from Yemen to Germany, then projects as images with their titles.
 */
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
          admin: {
            description: label(
              'Darunter steht der Leitsatz aus den Website-Einstellungen.',
              'The tagline from the site settings appears below it.',
              'يظهر تحته الشعار النصي من إعدادات الموقع.',
            ),
          },
        },
      ],
    },
    {
      name: 'journey',
      type: 'group',
      label: label('Weg (Scroll-Szene)', 'Journey (scroll scene)', 'المسار (مشهد التمرير)'),
      admin: {
        description: label(
          'Zwei kurze Zeilen: Beim Scrollen wird es vom ersten zum zweiten Satz „Tag“.',
          'Two short lines: while scrolling, night turns to day from the first to the second.',
          'سطران قصيران: مع التمرير يتحول الليل إلى نهار من السطر الأول إلى الثاني.',
        ),
      },
      fields: [
        {
          name: 'from',
          type: 'text',
          localized: true,
          maxLength: 60,
          label: label('Erste Zeile', 'First line', 'السطر الأول'),
        },
        {
          name: 'to',
          type: 'text',
          localized: true,
          maxLength: 60,
          label: label('Zweite Zeile', 'Second line', 'السطر الثاني'),
        },
      ],
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
      ],
    },
  ],
})
