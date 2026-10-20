import type { CollectionConfig, TextFieldSingleValidation } from 'payload'

import { allow, allowed } from '../access/roles'
import { hiddenWithoutContent } from './content-access'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'
import { groups, label, localizedMessage } from '../lib/labels'
import { consentCheckbox } from './TeamMembers'

const validateHttpsUrl: TextFieldSingleValidation = (value, { req }) =>
  !value || /^https:\/\/[^\s]+$/.test(value)
    ? true
    : localizedMessage(
        label(
          'Bitte eine https://-Adresse eingeben.',
          'Please enter an https:// address.',
          'يرجى إدخال عنوان يبدأ بـ https://.',
        ),
        req,
      )

export const Partners: CollectionConfig = {
  slug: 'partners',
  labels: {
    singular: label('Partner', 'Partner', 'شريك'),
    plural: label('Partner', 'Partners', 'الشركاء'),
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'url', 'permissionConfirmed'],
    group: groups.content,
    hidden: hiddenWithoutContent,
  },
  defaultSort: 'order',
  access: {
    // Partners are shown only with their permission (name and logo are their marks).
    read: async ({ req }) =>
      (await allowed(req, 'content.read')) ? true : { permissionConfirmed: { equals: true } },
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
    },
    { name: 'logo', type: 'upload', relationTo: 'media', label: label('Logo', 'Logo', 'الشعار') },
    {
      name: 'url',
      type: 'text',
      label: label('Website', 'Website', 'الموقع الإلكتروني'),
      validate: validateHttpsUrl,
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      maxLength: 400,
      label: label('Kurzbeschreibung', 'Short description', 'وصف قصير'),
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: label('Reihenfolge', 'Order', 'الترتيب'),
      admin: { position: 'sidebar' },
    },
    consentCheckbox(
      'permissionConfirmed',
      label(
        'Der Partner hat der Nennung zugestimmt',
        'The partner agreed to be listed',
        'وافق الشريك على ذكره',
      ),
    ),
  ],
}
