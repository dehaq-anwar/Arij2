import type { CollectionConfig } from 'payload'

import { allow, publishedOrContentReader } from '../access/roles'
import { hiddenWithoutContent } from './content-access'
import { seoField } from '../fields/seo'
import { slugField } from '../fields/slug'
import { DAY_PICKER } from '../fields/date'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'
import { livePreview, previewUrl } from '../preview/live-preview'
import { groups, label } from '../lib/labels'
import { setPublishedAt } from './Projects'

export const News: CollectionConfig = {
  slug: 'news',
  labels: {
    singular: label('Beitrag', 'Post', 'خبر'),
    plural: label('Aktuelles', 'News', 'الأخبار'),
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedAt', '_status'],
    livePreview: livePreview('news'),
    preview: (doc, { locale, req }) => previewUrl('news', doc?.id, locale, req),
    group: groups.content,
    hidden: hiddenWithoutContent,
  },
  versions: { drafts: { autosave: { interval: 2000 }, schedulePublish: true }, maxPerDoc: 50 },
  defaultSort: '-publishedAt',
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
    beforeChange: [setPublishedAt],
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      label: label('Titel', 'Title', 'العنوان'),
    },
    slugField(),
    {
      name: 'excerpt',
      type: 'textarea',
      required: true,
      localized: true,
      maxLength: 300,
      label: label('Kurztext', 'Summary', 'الملخص'),
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      label: label('Titelbild', 'Cover image', 'صورة الغلاف'),
    },
    { name: 'body', type: 'richText', localized: true, label: label('Text', 'Text', 'النص') },
    {
      name: 'relatedProjects',
      type: 'relationship',
      relationTo: 'projects',
      hasMany: true,
      label: label('Zugehörige Projekte', 'Related projects', 'مشاريع ذات صلة'),
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: label('Veröffentlicht am', 'Published on', 'تاريخ النشر'),
      admin: { position: 'sidebar', date: DAY_PICKER },
    },
    seoField,
  ],
}
