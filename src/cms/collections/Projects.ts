import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { allow, publishedOrContentReader } from '../access/roles'
import { hiddenWithoutContent } from './content-access'
import { seoField } from '../fields/seo'
import { slugField } from '../fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'
import { groups, label } from '../lib/labels'

/** Sets the publication date the first time a document is published. */
export const setPublishedAt: CollectionBeforeChangeHook = ({ data }) =>
  data._status === 'published' && !data.publishedAt
    ? { ...data, publishedAt: new Date().toISOString() }
    : data

export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: {
    singular: label('Projekt', 'Project', 'مشروع'),
    plural: label('Projekte', 'Projects', 'المشاريع'),
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'stage', 'publishedAt', '_status'],
    group: groups.content,
    hidden: hiddenWithoutContent,
  },
  versions: { drafts: true, maxPerDoc: 25 },
  defaultSort: '-publishedAt',
  access: {
    read: publishedOrContentReader,
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
      admin: {
        description: label(
          'Erscheint in der Projektliste und in Suchmaschinen.',
          'Shown in the project list and in search engines.',
          'يظهر في قائمة المشاريع وفي محركات البحث.',
        ),
      },
    },
    {
      type: 'row',
      fields: [
        {
          // Not "status": with drafts enabled, Payload already has _status, and both would map to
          // the same Postgres enum name (enum_projects_status).
          name: 'stage',
          type: 'select',
          label: label('Stand', 'Status', 'الحالة'),
          options: [
            { value: 'planned', label: label('Geplant', 'Planned', 'مخطط له') },
            { value: 'ongoing', label: label('Laufend', 'Ongoing', 'جارٍ') },
            { value: 'completed', label: label('Abgeschlossen', 'Completed', 'مكتمل') },
          ],
        },
        { name: 'startDate', type: 'date', label: label('Beginn', 'Start', 'البداية') },
        { name: 'endDate', type: 'date', label: label('Ende', 'End', 'النهاية') },
      ],
    },
    { name: 'location', type: 'text', localized: true, label: label('Ort', 'Location', 'المكان') },
    {
      name: 'focusAreas',
      type: 'relationship',
      relationTo: 'focus-areas',
      hasMany: true,
      label: label('Schwerpunkte', 'Focus areas', 'مجالات العمل'),
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      label: label('Titelbild', 'Cover image', 'صورة الغلاف'),
    },
    {
      name: 'body',
      type: 'richText',
      localized: true,
      label: label('Beschreibung', 'Description', 'الوصف'),
    },
    {
      name: 'gallery',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      label: label('Bildergalerie', 'Gallery', 'معرض الصور'),
    },
    {
      name: 'partners',
      type: 'relationship',
      relationTo: 'partners',
      hasMany: true,
      label: label('Partner', 'Partners', 'الشركاء'),
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
