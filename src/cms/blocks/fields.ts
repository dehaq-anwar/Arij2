import type {
  ArrayField,
  Field,
  GroupField,
  PayloadRequest,
  TextField,
  TextFieldSingleValidation,
  UploadField,
} from 'payload'
import { text } from 'payload/shared'

import { isSafeUrl } from '@/lib/safe-url'
import { SITE_ROUTE_LABELS, SITE_ROUTES } from '@/lib/site-routes'

import { label, localizedMessage, type AdminLabel } from '../lib/labels'

/**
 * Building parts of the page builder's blocks. Every field has a limit: texts a maximum length,
 * lists a maximum number of entries, choices a fixed set of values from the design system. There
 * is no free HTML, no colour or size, and links are checked (src/lib/safe-url.ts).
 */

export const headingField = ({
  required = false,
  maxLength = 120,
  description,
}: { required?: boolean; maxLength?: number; description?: AdminLabel } = {}): TextField => ({
  name: 'heading',
  type: 'text',
  localized: true,
  required,
  maxLength,
  label: label('Überschrift', 'Heading', 'العنوان'),
  admin: description ? { description } : undefined,
})

/** A heading that may stay empty: the website then shows its usual heading for the section. */
export const optionalHeading = headingField({
  description: label(
    'Leer lassen für die übliche Überschrift dieses Bereichs.',
    'Leave empty for the usual heading of this section.',
    'اتركه فارغًا لاستخدام العنوان المعتاد لهذا القسم.',
  ),
})

export const richTextField = (
  name: string,
  title: AdminLabel,
  { required = false }: { required?: boolean } = {},
): Field => ({ name, type: 'richText', localized: true, required, label: title })

export const imageField = (
  name: string,
  title: AdminLabel,
  { required = false }: { required?: boolean } = {},
): UploadField => ({
  name,
  type: 'upload',
  relationTo: 'media',
  required,
  label: title,
})

export const ICONS = [
  'youth',
  'peace',
  'integration',
  'entrepreneurship',
  'education',
  'community',
] as const

/** The design's symbols, named the same wherever one is chosen (blocks, focus areas). */
export const ICON_OPTIONS = [
  { value: 'youth', label: label('Junge Menschen', 'Young people', 'الشباب') },
  { value: 'peace', label: label('Frieden', 'Peace', 'السلام') },
  { value: 'integration', label: label('Integration', 'Integration', 'الاندماج') },
  {
    value: 'entrepreneurship',
    label: label('Unternehmertum', 'Entrepreneurship', 'ريادة الأعمال'),
  },
  { value: 'education', label: label('Bildung', 'Education', 'التعليم') },
  { value: 'community', label: label('Gemeinschaft', 'Community', 'المجتمع') },
]

export const iconField: Field = {
  name: 'icon',
  type: 'select',
  label: label('Symbol', 'Icon', 'الأيقونة'),
  options: ICON_OPTIONS,
}

const urlMessage = label(
  'Bitte eine vollständige Adresse eingeben, die mit https:// beginnt (oder mailto: bzw. tel:).',
  'Please enter a complete address starting with https:// (or mailto: or tel:).',
  'يرجى إدخال عنوان كامل يبدأ بـ ‎https://‎ (أو mailto: أو tel:).',
)
const requiredMessage = label('Bitte ausfüllen.', 'Please fill in.', 'يرجى تعبئة هذا الحقل.')

type LinkData = { kind?: string; route?: string; page?: unknown; url?: string }

/** The route or page of a link is required when it is the chosen kind of target. */
const requiredFor =
  (kind: 'route' | 'page') =>
  (value: unknown, { req, siblingData }: { req: PayloadRequest; siblingData: unknown }) =>
    (siblingData as LinkData)?.kind !== kind || value
      ? (true as const)
      : localizedMessage(requiredMessage, req)

const validateUrl: TextFieldSingleValidation = (value, { req, siblingData }) => {
  if ((siblingData as LinkData)?.kind !== 'url') return true
  return isSafeUrl(value, { relative: false }) ? true : localizedMessage(urlMessage, req)
}

/** Where a button or card leads: a fixed page of the website, a page of the builder, or a URL. */
export const linkFields = (): Field[] => [
  {
    type: 'row',
    fields: [
      {
        name: 'label',
        type: 'text',
        localized: true,
        required: true,
        maxLength: 40,
        label: label('Beschriftung', 'Label', 'النص الظاهر'),
      },
      {
        name: 'kind',
        type: 'select',
        required: true,
        defaultValue: 'route',
        label: label('Ziel', 'Target', 'الوجهة'),
        options: [
          { value: 'route', label: label('Seite der Website', 'Website page', 'صفحة في الموقع') },
          { value: 'page', label: label('Eigene Seite', 'Custom page', 'صفحة مخصصة') },
          { value: 'url', label: label('Adresse (URL)', 'Address (URL)', 'عنوان (URL)') },
        ],
      },
    ],
  },
  {
    name: 'route',
    type: 'select',
    label: label('Seite', 'Page', 'الصفحة'),
    options: SITE_ROUTES.map((route) => ({ value: route, label: SITE_ROUTE_LABELS[route] })),
    admin: { condition: (_, sibling) => (sibling as LinkData)?.kind === 'route' },
    validate: requiredFor('route'),
  },
  {
    name: 'page',
    type: 'relationship',
    relationTo: 'pages',
    label: label('Eigene Seite', 'Custom page', 'صفحة مخصصة'),
    admin: { condition: (_, sibling) => (sibling as LinkData)?.kind === 'page' },
    validate: requiredFor('page'),
  },
  {
    name: 'url',
    type: 'text',
    maxLength: 2000,
    label: label('Adresse (URL)', 'Address (URL)', 'العنوان (URL)'),
    admin: {
      condition: (_, sibling) => (sibling as LinkData)?.kind === 'url',
      placeholder: 'https://',
    },
    validate: validateUrl,
  },
]

export const linkGroup = (name = 'link', title = label('Link', 'Link', 'الرابط')): GroupField => ({
  name,
  type: 'group',
  label: title,
  fields: linkFields(),
})

/** Up to `max` buttons; the first is shown as the main button, the others more quietly. */
export const buttonsField = ({
  max = 3,
  min = 0,
}: { max?: number; min?: number } = {}): ArrayField => ({
  name: 'buttons',
  type: 'array',
  minRows: min,
  maxRows: max,
  label: label('Schaltflächen', 'Buttons', 'الأزرار'),
  labels: {
    singular: label('Schaltfläche', 'Button', 'زر'),
    plural: label('Schaltflächen', 'Buttons', 'الأزرار'),
  },
  admin: {
    initCollapsed: true,
    description: label(
      'Die erste Schaltfläche ist die wichtigste und wird hervorgehoben.',
      'The first button is the main one and is highlighted.',
      'الزر الأول هو الرئيسي ويُبرز.',
    ),
  },
  fields: linkFields(),
})

/** A short plain text (no formatting), e.g. a lead under a title. */
export const plainText = (
  name: string,
  title: AdminLabel,
  { maxLength = 300, required = false }: { maxLength?: number; required?: boolean } = {},
): Field => ({
  name,
  type: 'textarea',
  localized: true,
  required,
  maxLength,
  label: title,
  admin: { rows: 3 },
  validate: (value, args) => text(value as string, { ...args, required } as never),
})
