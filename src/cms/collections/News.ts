import type { CollectionConfig } from 'payload'

import { isEditor, publishedOrEditor } from '../access/roles'
import { seoField } from '../fields/seo'
import { slugField } from '../fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'
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
    group: groups.content,
  },
  versions: { drafts: true, maxPerDoc: 25 },
  defaultSort: '-publishedAt',
  access: { read: publishedOrEditor, create: isEditor, update: isEditor, delete: isEditor },
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
      admin: { position: 'sidebar' },
    },
    seoField,
  ],
}
