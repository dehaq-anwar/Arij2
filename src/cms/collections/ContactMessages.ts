import type { CollectionConfig } from 'payload'

import { allow, nobody } from '../access/roles'
import { groups, label } from '../lib/labels'
import { consentRecord, hiddenWithoutInbox, submitted, submittedLocale } from './inbox'
import { MEMBERSHIP_ROLES } from './membership-fields'

/** Messages from the contact form. Deleted automatically six months after they arrived. */
export const ContactMessages: CollectionConfig = {
  slug: 'contact-messages',
  labels: {
    singular: label('Kontaktnachricht', 'Contact message', 'رسالة تواصل'),
    plural: label('Kontaktnachrichten', 'Contact messages', 'رسائل التواصل'),
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'topic', 'status', 'assignedTo', 'createdAt'],
    group: groups.inbox,
    hidden: hiddenWithoutInbox,
    description: label(
      'Antworten per E-Mail. Nachrichten werden sechs Monate nach Eingang automatisch gelöscht.',
      'Reply by e-mail. Messages are deleted automatically six months after they arrived.',
      'يُرد بالبريد الإلكتروني. تُحذف الرسائل تلقائيًا بعد ستة أشهر من وصولها.',
    ),
  },
  defaultSort: '-createdAt',
  access: {
    create: nobody,
    read: allow('inbox.read'),
    update: allow('inbox.write'),
    delete: allow('messages.delete'),
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          maxLength: 200,
          label: label('Name', 'Name', 'الاسم'),
          admin: submitted,
        },
        {
          name: 'email',
          type: 'email',
          required: true,
          label: label('E-Mail', 'E-mail', 'البريد الإلكتروني'),
          admin: submitted,
        },
      ],
    },
    {
      name: 'topic',
      type: 'select',
      required: true,
      label: label('Thema', 'Topic', 'الموضوع'),
      options: [
        { value: 'general', label: label('Allgemein', 'General', 'عام') },
        { value: 'membership', label: label('Mitgliedschaft', 'Membership', 'العضوية') },
        { value: 'volunteering', label: label('Ehrenamt', 'Volunteering', 'التطوع') },
        { value: 'partnership', label: label('Partnerschaft', 'Partnership', 'الشراكة') },
        { value: 'press', label: label('Presse', 'Press', 'الصحافة') },
        { value: 'other', label: label('Sonstiges', 'Other', 'أخرى') },
      ],
      admin: submitted,
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
      maxLength: 5000,
      label: label('Nachricht', 'Message', 'الرسالة'),
      admin: submitted,
    },
    consentRecord,
    submittedLocale,
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      label: label('Status', 'Status', 'الحالة'),
      options: [
        { value: 'new', label: label('Neu', 'New', 'جديدة') },
        { value: 'answered', label: label('Beantwortet', 'Answered', 'تم الرد') },
        { value: 'closed', label: label('Erledigt', 'Closed', 'مغلقة') },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      label: label('Zuständig', 'Assigned to', 'المسؤول'),
      filterOptions: {
        and: [{ role: { in: [...MEMBERSHIP_ROLES] } }, { disabled: { not_equals: true } }],
      },
      admin: { position: 'sidebar' },
    },
  ],
}
