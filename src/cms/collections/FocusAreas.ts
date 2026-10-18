import type { CollectionConfig } from 'payload'

import { isEditor } from '../access/roles'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'
import { groups, label } from '../lib/labels'

export const FOCUS_ICONS = [
  'youth',
  'peace',
  'integration',
  'entrepreneurship',
  'education',
  'community',
] as const

export const FocusAreas: CollectionConfig = {
  slug: 'focus-areas',
  labels: {
    singular: label('Schwerpunkt', 'Focus area', 'مجال عمل'),
    plural: label('Schwerpunkte', 'Focus areas', 'مجالات العمل'),
  },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'order'], group: groups.content },
  defaultSort: 'order',
  access: { read: () => true, create: isEditor, update: isEditor, delete: isEditor },
  hooks: { afterChange: [revalidateAfterChange], afterDelete: [revalidateAfterDelete] },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      label: label('Titel', 'Title', 'العنوان'),
    },
    {
      name: 'summary',
      type: 'textarea',
      required: true,
      localized: true,
      maxLength: 280,
      label: label('Kurzbeschreibung', 'Summary', 'وصف قصير'),
    },
    {
      name: 'icon',
      type: 'select',
      required: true,
      defaultValue: 'youth',
      label: label('Symbol', 'Icon', 'الأيقونة'),
      options: [
        { value: 'youth', label: label('Junge Menschen', 'Young people', 'الشباب') },
        { value: 'peace', label: label('Frieden', 'Peace', 'السلام') },
        { value: 'integration', label: label('Integration', 'Integration', 'الاندماج') },
        {
          value: 'entrepreneurship',
          label: label('Unternehmertum', 'Entrepreneurship', 'ريادة الأعمال'),
        },
        { value: 'education', label: label('Bildung', 'Education', 'التعليم') },
        { value: 'community', label: label('Gemeinschaft', 'Community', 'المجتمع') },
      ],
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: label('Reihenfolge', 'Order', 'الترتيب'),
      admin: { position: 'sidebar' },
    },
  ],
}
