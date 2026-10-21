import type { EmailField, Field, TextField } from 'payload'
import { email, text } from 'payload/shared'

import { label } from '../lib/labels'

/** Calendar days in the edit screens, with the year (Payload's default for days omits it). */
export const DAY_PICKER = { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' } as const

/**
 * A required field, unless the document's `waiver` field is set: the date on which the data
 * were moved to the members register (applications) or removed after the review (members).
 * Without a waiver the field is simply required (NOT NULL in the database).
 */
type Waiver = 'personalDataMovedOn' | 'contactDataRemovedOn'
const waived = (data: unknown, waiver?: Waiver) =>
  Boolean(waiver && (data as Record<string, unknown> | undefined)?.[waiver])

function requiredText(field: Omit<TextField, 'type'>, waiver?: Waiver): TextField {
  if (!waiver) return { ...field, type: 'text', required: true } as TextField
  return {
    ...field,
    type: 'text',
    validate: (value, args) =>
      waived(args.data, waiver) ? true : text(value, { ...args, required: true }),
  } as TextField
}

/**
 * The person's fields as the membership application collects them (Satzung § 3). The members
 * register uses exactly these and nothing more: no field here may be added without the
 * association's decision (docs/CONTROL-CENTER.md §5, decision 12).
 */
export const nameRow = (waiver?: Waiver): Field => ({
  type: 'row',
  fields: [
    requiredText(
      { name: 'firstName', maxLength: 100, label: label('Vorname', 'First name', 'الاسم الأول') },
      waiver,
    ),
    requiredText(
      { name: 'lastName', maxLength: 100, label: label('Nachname', 'Last name', 'اسم العائلة') },
      waiver,
    ),
  ],
})

export const emailField = (waiver?: Waiver): EmailField =>
  waiver
    ? {
        name: 'email',
        type: 'email',
        label: label('E-Mail', 'E-mail', 'البريد الإلكتروني'),
        validate: (value, args) =>
          waived(args.data, waiver) ? true : email(value, { ...args, required: true }),
      }
    : {
        name: 'email',
        type: 'email',
        required: true,
        label: label('E-Mail', 'E-mail', 'البريد الإلكتروني'),
      }

export const addressGroup = (waiver?: Waiver): Field => ({
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
    requiredText(
      {
        name: 'street',
        maxLength: 150,
        label: label('Straße und Hausnummer', 'Street and number', 'الشارع ورقم المنزل'),
      },
      waiver,
    ),
    {
      type: 'row',
      fields: [
        requiredText(
          { name: 'postalCode', maxLength: 12, label: label('PLZ', 'Postcode', 'الرمز البريدي') },
          waiver,
        ),
        requiredText(
          { name: 'city', maxLength: 100, label: label('Ort', 'City', 'المدينة') },
          waiver,
        ),
        requiredText(
          { name: 'country', maxLength: 100, label: label('Land', 'Country', 'البلد') },
          waiver,
        ),
      ],
    },
  ],
})

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
    admin: { date: DAY_PICKER },
  },
]

/**
 * The title of an application or a register entry in the edit screen, in relationship fields and
 * in the history: "Last name, first name". Kept up to date by the collections' hooks; once an
 * application's personal data were moved to the register it holds only the number ("#12"), so
 * no name stays behind in the application.
 */
export const displayTitleField: TextField = {
  name: 'displayTitle',
  type: 'text',
  label: label('Titel', 'Title', 'العنوان'),
  admin: { hidden: true },
}

type Named = {
  id?: number | string
  firstName?: string | null
  lastName?: string | null
  personalDataMovedOn?: string | null
}

export function displayTitle(doc: Named): string | null {
  if (doc.personalDataMovedOn) return doc.id == null ? null : `#${doc.id}`
  const name = [doc.lastName, doc.firstName].filter((part) => part?.trim()).join(', ')
  return name || (doc.id == null ? null : `#${doc.id}`)
}
