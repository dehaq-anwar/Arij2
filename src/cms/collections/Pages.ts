import type {
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionConfig,
  TextFieldSingleValidation,
} from 'payload'

import { routing } from '@/i18n/routing'
import { slugify, SLUG_PATTERN } from '@/lib/slugify'
import { SYSTEM_PAGES, type SystemPage } from '@/lib/site-routes'

import { allow, publishedOrContentReader } from '../access/roles'
import { PAGE_BLOCKS } from '../blocks'
import { MAX_BLOCKS, validateLayout } from '../blocks/layout-rules'
import { seoField } from '../fields/seo'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'
import { refuse } from '../lib/errors'
import { DAY_PICKER } from '../fields/date'
import { livePreview, previewUrl } from '../preview/live-preview'
import { groups, label, localizedMessage } from '../lib/labels'
import { hiddenWithoutContent } from './content-access'
import { setPublishedAt } from './Projects'

/**
 * Pages of the website, put together from the design system's blocks (src/cms/blocks). Five of
 * them are the website's fixed pages ("system pages": home, about, membership, support, contact):
 * they keep their addresses, cannot be deleted, and the forms stay on their own page. Further
 * pages get an address of their own: /<slug>, /en/<slug>, /ar/<slug>.
 */

/** Context flag: a system page is created (migration and seed only). */
export const SYSTEM_PAGE = 'systemPage'

/** First path segments the website and the Control Center already use. */
export const RESERVED_SLUGS = new Set<string>([
  ...routing.locales,
  ...SYSTEM_PAGES,
  ...Object.entries(routing.pathnames).flatMap(([internal, localized]) => [
    internal.split('/')[1] ?? '',
    ...(typeof localized === 'string' ? [localized] : Object.values(localized)).map(
      (path) => path.split('/')[1] ?? '',
    ),
  ]),
  'admin',
  'api',
  'preview',
  'media',
  'fonts',
  'veranstaltungen',
  'events',
  'sitemap',
  'robots',
  'favicon',
  'icon',
  'apple-icon',
])
RESERVED_SLUGS.delete('')

const slugMessages = {
  pattern: label(
    'Bitte ein URL-Kürzel aus Kleinbuchstaben, Ziffern und Bindestrichen eingeben (z. B. „sommerfest-2026“).',
    'Please enter a URL slug of lowercase letters, digits and hyphens (e.g. "summer-party-2026").',
    'يرجى إدخال معرّف رابط من أحرف لاتينية صغيرة وأرقام وشرطات (مثل «summer-party-2026»).',
  ),
  reserved: label(
    'Dieses URL-Kürzel ist für eine Seite der Website reserviert. Bitte ein anderes wählen.',
    'This URL slug is reserved for a page of the website. Please choose another one.',
    'هذا المعرّف محجوز لصفحة من صفحات الموقع. يرجى اختيار معرّف آخر.',
  ),
}

const validateSlug: TextFieldSingleValidation = (value, { data, req }) => {
  if ((data as { systemKey?: string | null })?.systemKey) return true
  if (typeof value !== 'string' || !SLUG_PATTERN.test(value)) {
    return localizedMessage(slugMessages.pattern, req)
  }
  return RESERVED_SLUGS.has(value) ? localizedMessage(slugMessages.reserved, req) : true
}

/** The system key and the slug of a system page are fixed; others cannot become one. */
const guardSystemPages: CollectionBeforeChangeHook = ({
  context,
  data,
  operation,
  originalDoc,
}) => {
  if (operation === 'create') {
    const systemKey = context?.[SYSTEM_PAGE] ? (data.systemKey as SystemPage) : null
    return { ...data, systemKey, ...(systemKey ? { slug: systemKey } : {}) }
  }
  const systemKey = (originalDoc?.systemKey as SystemPage | null) ?? null
  return { ...data, systemKey, ...(systemKey ? { slug: systemKey } : {}) }
}

const keepSystemPages: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const page = await req.payload.findByID({
    collection: 'pages',
    id,
    depth: 0,
    overrideAccess: true,
    select: { systemKey: true },
    req,
  })
  if (page?.systemKey) {
    throw refuse(
      req,
      label(
        'Diese Seite gehört zum festen Aufbau der Website und kann nicht gelöscht werden.',
        'This page is part of the fixed structure of the website and cannot be deleted.',
        'هذه الصفحة جزء من البنية الثابتة للموقع ولا يمكن حذفها.',
      ),
      409,
    )
  }
}

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: {
    singular: label('Seite', 'Page', 'صفحة'),
    plural: label('Seiten', 'Pages', 'الصفحات'),
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'systemKey', '_status', 'updatedAt'],
    livePreview: livePreview('pages'),
    preview: (doc, { locale, req }) => previewUrl('pages', doc?.id, locale, req),
    group: groups.pages,
    hidden: hiddenWithoutContent,
    description: label(
      'Seiten aus Bausteinen des Designs: Blöcke hinzufügen, ordnen und mit Texten und Bildern füllen. Entwürfe sind erst nach „Veröffentlichen“ sichtbar.',
      'Pages built from the design’s building blocks: add, order and fill blocks with texts and images. Drafts are visible only after "Publish".',
      'صفحات مبنية من كتل التصميم: أضف الكتل ورتّبها واملأها بالنصوص والصور. لا تظهر المسودات إلا بعد «النشر».',
    ),
  },
  versions: {
    drafts: { autosave: { interval: 2000 }, schedulePublish: true },
    maxPerDoc: 50,
  },
  defaultSort: 'title',
  access: {
    read: publishedOrContentReader,
    // Earlier versions and drafts: for those who see content in full (Payload's default:
    // anyone signed in).
    readVersions: allow('content.read'),
    create: allow('content.write'),
    update: allow('content.write'),
    delete: allow('content.write'),
  },
  hooks: {
    beforeChange: [guardSystemPages, setPublishedAt],
    beforeDelete: [keepSystemPages],
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      maxLength: 120,
      label: label('Titel', 'Title', 'العنوان'),
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      maxLength: 80,
      label: label('URL-Kürzel', 'URL slug', 'المعرّف في الرابط'),
      admin: {
        position: 'sidebar',
        condition: (data) => !data?.systemKey,
        description: label(
          'Adresse der Seite (für alle Sprachen gleich). Wird aus dem Titel erzeugt, wenn es leer bleibt.',
          'Address of the page (the same in all languages). Generated from the title when left empty.',
          'عنوان الصفحة (نفسه في كل اللغات). يُولَّد من العنوان إذا تُرك فارغًا.',
        ),
      },
      hooks: {
        beforeValidate: [
          ({ value, siblingData }) => {
            if (typeof value === 'string' && value.trim()) return slugify(value)
            const title = (siblingData as { title?: unknown } | undefined)?.title
            return typeof title === 'string' ? slugify(title) || undefined : value
          },
        ],
      },
      validate: validateSlug,
    },
    {
      name: 'systemKey',
      type: 'select',
      unique: true,
      index: true,
      label: label('Feste Seite', 'Fixed page', 'صفحة ثابتة'),
      options: [
        { value: 'home', label: label('Startseite', 'Home page', 'الصفحة الرئيسية') },
        { value: 'about', label: label('Über uns', 'About us', 'من نحن') },
        { value: 'membership', label: label('Mitglied werden', 'Membership', 'العضوية') },
        { value: 'support', label: label('Unterstützen', 'Support us', 'ادعمنا') },
        { value: 'contact', label: label('Kontakt', 'Contact', 'تواصل معنا') },
      ],
      admin: {
        position: 'sidebar',
        readOnly: true,
        condition: (data) => Boolean(data?.systemKey),
        description: label(
          'Gehört zum festen Aufbau der Website: Adresse und Formular bleiben, löschen ist nicht möglich.',
          'Part of the fixed structure of the website: address and form stay, it cannot be deleted.',
          'جزء من البنية الثابتة للموقع: يبقى العنوان والنموذج ولا يمكن الحذف.',
        ),
      },
    },
    {
      name: 'layout',
      type: 'blocks',
      required: true,
      minRows: 1,
      maxRows: MAX_BLOCKS,
      blocks: PAGE_BLOCKS,
      label: label('Inhalt der Seite', 'Content of the page', 'محتوى الصفحة'),
      labels: {
        singular: label('Block', 'Block', 'كتلة'),
        plural: label('Blöcke', 'Blocks', 'الكتل'),
      },
      admin: {
        initCollapsed: true,
        description: label(
          'Jeder Block ist ein Abschnitt im Design der Website. Reihenfolge per Ziehen ändern; die Vorschau zeigt das Ergebnis.',
          'Each block is a section in the design of the website. Drag to reorder; the preview shows the result.',
          'كل كتلة قسم من تصميم الموقع. اسحب لتغيير الترتيب، وتعرض المعاينة النتيجة.',
        ),
      },
      validate: validateLayout,
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: label('Veröffentlicht am', 'Published on', 'تاريخ النشر'),
      admin: { position: 'sidebar', readOnly: true, date: DAY_PICKER },
    },
    seoField,
  ],
}
