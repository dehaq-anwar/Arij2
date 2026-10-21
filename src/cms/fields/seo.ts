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
      // How the page appears in search results, live while typing (src/cms/admin/seo).
      name: 'searchPreview',
      type: 'ui',
      admin: { components: { Field: '/cms/admin/seo/SearchPreview#SearchPreview' } },
    },
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
      admin: {
        description: label(
          'Erscheint, wenn die Seite in Messengern oder sozialen Netzwerken geteilt wird. Ohne Angabe: das Titelbild.',
          'Shown when the page is shared in messengers or social networks. If empty: the cover image.',
          'تظهر عند مشاركة الصفحة في تطبيقات المراسلة أو الشبكات الاجتماعية. إن تُركت فارغة: صورة الغلاف.',
        ),
      },
    },
    {
      name: 'noIndex',
      type: 'checkbox',
      defaultValue: false,
      label: label(
        'Nicht in Suchmaschinen anzeigen',
        'Hide from search engines',
        'إخفاء من محركات البحث',
      ),
      admin: {
        description: label(
          'Die Seite bleibt erreichbar, wird aber nicht in Suchergebnisse und die Sitemap aufgenommen.',
          'The page stays reachable but is left out of search results and the sitemap.',
          'تبقى الصفحة متاحة لكنها لا تظهر في نتائج البحث ولا في خريطة الموقع.',
        ),
      },
    },
  ],
}
