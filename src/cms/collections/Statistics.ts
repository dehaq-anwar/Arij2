import type { CollectionConfig } from 'payload'

import { isEditor, isEditorField } from '../access/roles'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'
import { groups, label } from '../lib/labels'

/** The only source for counters on the site: every number needs a date and a source. */
export const Statistics: CollectionConfig = {
  slug: 'statistics',
  labels: {
    singular: label('Kennzahl', 'Statistic', 'رقم'),
    plural: label('Kennzahlen', 'Statistics', 'الأرقام'),
  },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'value', 'asOf', 'showOnHome'],
    group: groups.content,
  },
  defaultSort: 'order',
  access: { read: () => true, create: isEditor, update: isEditor, delete: isEditor },
  hooks: { afterChange: [revalidateAfterChange], afterDelete: [revalidateAfterDelete] },
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
      localized: true,
      label: label('Bezeichnung', 'Label', 'الوصف'),
    },
    {
      name: 'value',
      type: 'number',
      required: true,
      min: 0,
      label: label('Wert', 'Value', 'القيمة'),
    },
    {
      type: 'row',
      fields: [
        {
          name: 'prefix',
          type: 'text',
          localized: true,
          label: label('Präfix', 'Prefix', 'بادئة'),
        },
        {
          name: 'suffix',
          type: 'text',
          localized: true,
          label: label('Suffix (z. B. „+“)', 'Suffix (e.g. "+")', 'لاحقة (مثل «+»)'),
        },
      ],
    },
    { name: 'asOf', type: 'date', required: true, label: label('Stand vom', 'As of', 'بتاريخ') },
    {
      name: 'source',
      type: 'text',
      required: true,
      label: label('Quelle (intern)', 'Source (internal)', 'المصدر (داخلي)'),
      access: { read: isEditorField },
      admin: {
        description: label(
          'Woher stammt die Zahl? Wird nicht veröffentlicht.',
          'Where does the number come from? Not published.',
          'من أين جاء هذا الرقم؟ لا يُنشر.',
        ),
      },
    },
    {
      name: 'showOnHome',
      type: 'checkbox',
      defaultValue: true,
      label: label(
        'Auf der Startseite zeigen',
        'Show on the home page',
        'إظهار في الصفحة الرئيسية',
      ),
      admin: { position: 'sidebar' },
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
