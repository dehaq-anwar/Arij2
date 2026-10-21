import type { CheckboxField, CollectionConfig } from 'payload'

import { allow, allowed } from '../access/roles'
import { hiddenWithoutContent } from './content-access'
import { DAY_PICKER } from '../fields/date'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'
import { groups, label } from '../lib/labels'

export const consentCheckbox = (name: string, text: ReturnType<typeof label>): CheckboxField => ({
  name,
  type: 'checkbox',
  defaultValue: false,
  label: text,
  admin: { position: 'sidebar' },
})

export const TeamMembers: CollectionConfig = {
  slug: 'team-members',
  labels: {
    singular: label('Person', 'Person', 'شخص'),
    plural: label('Vorstand & Team', 'Board & team', 'مجلس الإدارة والفريق'),
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'position', 'group', 'publishConsent'],
    group: groups.content,
    hidden: hiddenWithoutContent,
  },
  defaultSort: 'order',
  access: {
    // Only people who agreed to be shown are public.
    read: async ({ req }) =>
      (await allowed(req, 'content.read')) ? true : { publishConsent: { equals: true } },
    create: allow('content.write'),
    update: allow('content.write'),
    delete: allow('content.write'),
  },
  hooks: { afterChange: [revalidateAfterChange], afterDelete: [revalidateAfterDelete] },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
      label: label('Name', 'Name', 'الاسم'),
      admin: {
        description: label(
          'Optional je Sprache, z. B. in arabischer Schrift. Leer: der deutsche Eintrag wird gezeigt.',
          'Optional per language, e.g. in Arabic script. Empty: the German entry is shown.',
          'اختياري لكل لغة، مثلًا بالحروف العربية. إذا تُرك فارغًا يظهر الإدخال الألماني.',
        ),
      },
    },
    {
      name: 'position',
      type: 'text',
      required: true,
      localized: true,
      label: label('Funktion', 'Position', 'المنصب'),
    },
    {
      name: 'group',
      type: 'select',
      required: true,
      defaultValue: 'board',
      label: label('Gruppe', 'Group', 'المجموعة'),
      options: [
        { value: 'board', label: label('Vorstand', 'Board', 'مجلس الإدارة') },
        { value: 'team', label: label('Team', 'Team', 'الفريق') },
      ],
    },
    { name: 'photo', type: 'upload', relationTo: 'media', label: label('Foto', 'Photo', 'الصورة') },
    {
      name: 'bio',
      type: 'textarea',
      localized: true,
      maxLength: 600,
      label: label('Kurzvorstellung', 'Short bio', 'نبذة قصيرة'),
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: label('Reihenfolge', 'Order', 'الترتيب'),
      admin: { position: 'sidebar' },
    },
    consentCheckbox(
      'publishConsent',
      label(
        'Einwilligung zur Veröffentlichung liegt vor',
        'Consent to publication has been given',
        'تمت الموافقة على النشر',
      ),
    ),
    {
      name: 'consentDate',
      type: 'date',
      label: label('Datum der Einwilligung', 'Date of consent', 'تاريخ الموافقة'),
      admin: {
        position: 'sidebar',
        condition: (_, sibling) => Boolean(sibling?.publishConsent),
        date: DAY_PICKER,
      },
    },
  ],
}
