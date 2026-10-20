import type { Field } from 'payload'

import { label } from '../lib/labels'

/**
 * The person's fields as the membership application collects them (Satzung § 3). The members
 * register uses exactly these and nothing more: no field here may be added without the
 * association's decision (docs/CONTROL-CENTER.md §5, decision 12).
 */
export const nameRow: Field = {
  type: 'row',
  fields: [
    {
      name: 'firstName',
      type: 'text',
      required: true,
      maxLength: 100,
      label: label('Vorname', 'First name', 'الاسم الأول'),
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
      maxLength: 100,
      label: label('Nachname', 'Last name', 'اسم العائلة'),
    },
  ],
}

export const emailField: Field = {
  name: 'email',
  type: 'email',
  required: true,
  label: label('E-Mail', 'E-mail', 'البريد الإلكتروني'),
}

export const addressGroup: Field = {
  name: 'address',
  type: 'group',
  label: label('Anschrift', 'Address', 'العنوان'),
  admin: {
    description: label(
      'Für schriftliche Einladungen zur Mitgliederversammlung (Satzung § 7).',
      'For written invitations to the general meeting (Satzung § 7).',
      'لإرسال الدعوات المكتوبة إلى الجمعية العمومية (النظام الأساسي § 7).',
    ),
  },
  fields: [
    {
      name: 'street',
      type: 'text',
      required: true,
      maxLength: 150,
      label: label('Straße und Hausnummer', 'Street and number', 'الشارع ورقم المنزل'),
    },
    {
      type: 'row',
      fields: [
        {
          name: 'postalCode',
          type: 'text',
          required: true,
          maxLength: 12,
          label: label('PLZ', 'Postcode', 'الرمز البريدي'),
        },
        {
          name: 'city',
          type: 'text',
          required: true,
          maxLength: 100,
          label: label('Ort', 'City', 'المدينة'),
        },
        {
          name: 'country',
          type: 'text',
          required: true,
          maxLength: 100,
          label: label('Land', 'Country', 'البلد'),
        },
      ],
    },
  ],
}

export const MEMBERSHIP_TYPES = ['ordinary', 'supporting'] as const

export const membershipTypeField: Field = {
  name: 'membershipType',
  type: 'select',
  required: true,
  label: label('Art der Mitgliedschaft', 'Type of membership', 'نوع العضوية'),
  options: [
    { value: 'ordinary', label: label('Ordentlich', 'Ordinary', 'عادية') },
    { value: 'supporting', label: label('Fördernd', 'Supporting', 'داعمة') },
  ],
}

/** Name and e-mail of the parent or guardian, and when their consent was received. */
export const guardianFields: Field[] = [
  {
    type: 'row',
    fields: [
      {
        name: 'name',
        type: 'text',
        maxLength: 200,
        label: label('Name', 'Name', 'الاسم'),
      },
      {
        name: 'email',
        type: 'email',
        label: label('E-Mail', 'E-mail', 'البريد الإلكتروني'),
      },
    ],
  },
  {
    name: 'consentReceivedAt',
    type: 'date',
    label: label('Zustimmung liegt vor seit', 'Consent received on', 'تاريخ استلام الموافقة'),
  },
]

/** Roles that work on applications and members (for assignment lists). */
export const MEMBERSHIP_ROLES = ['superAdmin', 'boardAdmin', 'membershipManager'] as const
