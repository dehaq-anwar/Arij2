import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'

import { allow, nobody } from '../access/roles'
import { groups, label } from '../lib/labels'
import { assigneeEndpoints, assigneeField } from '../membership/assignees'
import { adminHref, notify } from '../membership/notifications'
import { consentRecord, hiddenWithoutInbox, submitted, submittedLocale } from './inbox'

const assigneeOf = (value: unknown): number | null =>
  value && typeof value === 'object'
    ? Number((value as { id: number }).id)
    : value == null
      ? null
      : Number(value)

/** The person a message is assigned to is told in the Control Center (not when they took it). */
const tellAssignee: CollectionAfterChangeHook = async ({ doc, operation, previousDoc, req }) => {
  const assignee = assigneeOf(doc.assignedTo)
  if (
    operation === 'update' &&
    assignee &&
    assignee !== assigneeOf(previousDoc?.assignedTo) &&
    assignee !== Number(req.user?.id)
  ) {
    await notify(
      req.payload,
      {
        kind: 'assigned',
        recipients: [assignee],
        subjectType: 'contact-messages',
        subjectId: doc.id,
        href: adminHref('contact-messages', doc.id),
      },
      req,
    )
  }
  return doc
}

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
  endpoints: assigneeEndpoints,
  hooks: { afterChange: [tellAssignee] },
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
    assigneeField(),
  ],
}
