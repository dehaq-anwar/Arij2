import type { GroupField } from 'payload'

import { label } from '../lib/labels'

export const seoField: GroupField = {
  name: 'seo',
  type: 'group',
  label: label('Suchmaschinen & Teilen', 'Search engines & sharing', 'محركات البحث والمشاركة'),
  admin: {
    description: label(
      'Optional. Leer gelassen, werden Titel und Kurztext verwendet.',
      'Optional. When empty, the title and summary are used.',
      'اختياري. إذا تُرك فارغًا يُستخدم العنوان والملخص.',
    ),
  },
  fields: [
    {
      name: 'metaTitle',
      type: 'text',
      localized: true,
      maxLength: 70,
      label: label('Seitentitel', 'Page title', 'عنوان الصفحة'),
    },
    {
      name: 'metaDescription',
      type: 'textarea',
      localized: true,
      maxLength: 160,
      label: label('Beschreibung', 'Description', 'الوصف'),
    },
    {
      name: 'ogImage',
      type: 'upload',
      relationTo: 'media',
      label: label('Bild beim Teilen', 'Sharing image', 'صورة المشاركة'),
    },
  ],
}
