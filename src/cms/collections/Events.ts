import type { CollectionConfig, DateFieldValidation, TextFieldSingleValidation } from 'payload'

import { isSafeUrl } from '@/lib/safe-url'

import { allow, publishedOrContentReader } from '../access/roles'
import { seoField } from '../fields/seo'
import { slugField } from '../fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'
import { DAY_PICKER, DAY_TIME_PICKER } from '../fields/date'
import { groups, label, localizedMessage } from '../lib/labels'
import { livePreview, previewUrl } from '../preview/live-preview'
import { hiddenWithoutContent } from './content-access'
import { setPublishedAt } from './Projects'

const endsAfterStart: DateFieldValidation = (value, { siblingData, req }) => {
  const startsAt = (siblingData as { startsAt?: string | null } | undefined)?.startsAt
  if (!value || !startsAt || new Date(value as Date).getTime() >= new Date(startsAt).getTime()) {
    return true
  }
  return localizedMessage(
    label('Das Ende liegt vor dem Beginn.', 'The end is before the start.', 'النهاية قبل البداية.'),
    req,
  )
}

const validateRegistration: TextFieldSingleValidation = (value, { req }) =>
  !value || isSafeUrl(value, { relative: false })
    ? true
    : localizedMessage(
        label(
          'Bitte eine vollständige Adresse eingeben, die mit https:// beginnt (oder mailto:).',
          'Please enter a complete address starting with https:// (or mailto:).',
          'يرجى إدخال عنوان كامل يبدأ بـ https://‎ (أو mailto:).',
        ),
        req,
      )

/**
 * Events of the association (CC-2): date and time, place, text and image, optionally a link to
 * register. Listed at /veranstaltungen (/en/events, /ar/events), upcoming first, each with a
 * calendar file (.ics) to save the date; no third-party calendar or map is embedded.
 */
export const Events: CollectionConfig = {
  slug: 'events',
  labels: {
    singular: label('Veranstaltung', 'Event', 'فعالية'),
    plural: label('Veranstaltungen', 'Events', 'الفعاليات'),
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'startsAt', 'location', '_status'],
    livePreview: livePreview('events'),
    preview: (doc, { locale, req }) => previewUrl('events', doc?.id, locale, req),
    group: groups.content,
    hidden: hiddenWithoutContent,
  },
  versions: { drafts: { autosave: { interval: 2000 }, schedulePublish: true }, maxPerDoc: 50 },
  defaultSort: '-startsAt',
  access: {
    read: publishedOrContentReader,
    // Earlier versions and drafts: for those who see content in full (Payload's default:
    // anyone signed in).
    readVersions: allow('content.read'),
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
      maxLength: 120,
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
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startsAt',
          type: 'date',
          required: true,
          index: true,
          label: label('Beginn', 'Starts', 'البداية'),
          admin: {
            date: DAY_TIME_PICKER,
          },
        },
        {
          name: 'endsAt',
          type: 'date',
          label: label('Ende', 'Ends', 'النهاية'),
          admin: {
            date: DAY_TIME_PICKER,
          },
          validate: endsAfterStart,
        },
      ],
    },
    {
      name: 'location',
      type: 'text',
      localized: true,
      maxLength: 200,
      label: label('Ort', 'Place', 'المكان'),
      admin: {
        description: label(
          'Z. B. „Gemeindehaus, Musterstraße 1, Kiel“ oder „Online“.',
          'E.g. "Community hall, Musterstraße 1, Kiel" or "Online".',
          'مثل «قاعة الحي، شارع موستر 1، كيل» أو «عبر الإنترنت».',
        ),
      },
    },
    {
      name: 'registrationUrl',
      type: 'text',
      maxLength: 2000,
      label: label('Link zur Anmeldung', 'Registration link', 'رابط التسجيل'),
      admin: { placeholder: 'https://' },
      validate: validateRegistration,
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      label: label('Titelbild', 'Cover image', 'صورة الغلاف'),
    },
    { name: 'body', type: 'richText', localized: true, label: label('Text', 'Text', 'النص') },
    {
      name: 'publishedAt',
      type: 'date',
      label: label('Veröffentlicht am', 'Published on', 'تاريخ النشر'),
      admin: { position: 'sidebar', readOnly: true, date: DAY_PICKER },
    },
    seoField,
  ],
}
