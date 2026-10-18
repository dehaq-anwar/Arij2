import type { TextFieldSingleValidation } from 'payload'

import { groups, label, localizedMessage } from '../lib/labels'
import { pageGlobal } from './shared'

const validateEmail: TextFieldSingleValidation = (value, { req }) =>
  !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ? true
    : localizedMessage(
        label(
          'Ungültige E-Mail-Adresse.',
          'Invalid e-mail address.',
          'عنوان بريد إلكتروني غير صالح.',
        ),
        req,
      )

export const SiteSettings = pageGlobal({
  slug: 'site-settings',
  label: label('Website-Einstellungen', 'Site settings', 'إعدادات الموقع'),
  admin: { group: groups.settings },
  fields: [
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      maxLength: 160,
      label: label(
        'Beschreibung für Suchmaschinen',
        'Description for search engines',
        'الوصف لمحركات البحث',
      ),
    },
    {
      name: 'contact',
      type: 'group',
      label: label('Kontaktdaten', 'Contact details', 'بيانات التواصل'),
      fields: [
        {
          name: 'email',
          type: 'text',
          label: label('E-Mail', 'E-mail', 'البريد الإلكتروني'),
          validate: validateEmail,
        },
        { name: 'phone', type: 'text', label: label('Telefon', 'Phone', 'الهاتف') },
        {
          name: 'address',
          type: 'textarea',
          localized: true,
          label: label('Postanschrift', 'Postal address', 'العنوان البريدي'),
        },
      ],
    },
    {
      name: 'socialLinks',
      type: 'array',
      label: label('Social-Media-Links', 'Social media links', 'روابط التواصل الاجتماعي'),
      admin: {
        description: label(
          'Nur einfache Links – keine eingebetteten Feeds oder Widgets.',
          'Plain links only – no embedded feeds or widgets.',
          'روابط بسيطة فقط، دون منشورات أو أدوات مضمّنة.',
        ),
      },
      fields: [
        {
          name: 'platform',
          type: 'select',
          required: true,
          options: [
            'Instagram',
            'Facebook',
            'LinkedIn',
            'YouTube',
            'X',
            'TikTok',
            'Mastodon',
            'Telegram',
            'WhatsApp',
          ].map((p) => ({ label: p, value: p.toLowerCase() })),
          label: label('Plattform', 'Platform', 'المنصة'),
        },
        { name: 'url', type: 'text', required: true, label: label('Adresse', 'URL', 'الرابط') },
      ],
    },
  ],
})
