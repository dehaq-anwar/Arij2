import { label } from '../lib/labels'
import { pageGlobal } from './shared'

export const ContactPage = pageGlobal({
  slug: 'contact-page',
  label: label('Kontakt', 'Contact', 'تواصل معنا'),
  fields: [
    {
      name: 'intro',
      type: 'richText',
      localized: true,
      label: label('Einleitung', 'Introduction', 'المقدمة'),
    },
    {
      name: 'officeHours',
      type: 'textarea',
      localized: true,
      label: label('Erreichbarkeit', 'Availability', 'أوقات التواصل'),
    },
    {
      type: 'row',
      fields: [
        {
          name: 'showEmail',
          type: 'checkbox',
          defaultValue: true,
          label: label('E-Mail zeigen', 'Show e-mail', 'إظهار البريد'),
        },
        {
          name: 'showPhone',
          type: 'checkbox',
          defaultValue: false,
          label: label('Telefon zeigen', 'Show phone', 'إظهار الهاتف'),
        },
        {
          name: 'showAddress',
          type: 'checkbox',
          defaultValue: true,
          label: label('Anschrift zeigen', 'Show address', 'إظهار العنوان'),
        },
      ],
    },
  ],
})
