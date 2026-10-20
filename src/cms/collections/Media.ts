import type { CollectionConfig, TextFieldSingleValidation } from 'payload'

import { allow } from '../access/roles'
import { hiddenWithoutContent } from './content-access'
import { groups, label, localizedMessage } from '../lib/labels'

/** Alt text is required unless the image is marked decorative. */
const validateAlt: TextFieldSingleValidation = (value, { siblingData, req }) => {
  const decorative = (siblingData as { decorative?: boolean } | undefined)?.decorative
  if (decorative || (typeof value === 'string' && value.trim().length > 0)) return true
  return localizedMessage(
    label(
      'Bitte einen Alternativtext eingeben oder das Bild als dekorativ markieren.',
      'Please enter alt text or mark the image as decorative.',
      'يرجى إدخال نص بديل أو تمييز الصورة كزخرفية.',
    ),
    req,
  )
}

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: label('Bild', 'Image', 'صورة'),
    plural: label('Medien', 'Media', 'الوسائط'),
  },
  admin: {
    group: groups.content,
    hidden: hiddenWithoutContent,
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: allow('content.write'),
    update: allow('content.write'),
    delete: allow('content.write'),
  },
  upload: {
    // Used only when S3 is not configured (end-to-end tests); see payload.config.ts.
    staticDir: process.env.MEDIA_DIR || 'media',
    // No SVG: it can carry scripts.
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    // Re-encodes the original through sharp: caps its size and drops EXIF/GPS metadata.
    resizeOptions: { width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true },
    focalPoint: true,
    imageSizes: [
      { name: 'thumbnail', width: 480, withoutEnlargement: true },
      { name: 'card', width: 768, withoutEnlargement: true },
      { name: 'feature', width: 1280, withoutEnlargement: true },
      { name: 'hero', width: 1920, withoutEnlargement: true },
      { name: 'og', width: 1200, height: 630, position: 'centre' },
    ],
    adminThumbnail: 'thumbnail',
  },
  fields: [
    {
      name: 'decorative',
      type: 'checkbox',
      defaultValue: false,
      label: label('Rein dekorativ', 'Purely decorative', 'زخرفية فقط'),
      admin: {
        description: label(
          'Nur ankreuzen, wenn das Bild keine Information trägt. Es wird dann von Screenreadern übersprungen.',
          'Tick only if the image carries no information. Screen readers will then skip it.',
          'اختر هذا فقط إذا كانت الصورة لا تحمل أي معلومة، وعندها تتخطاها برامج قراءة الشاشة.',
        ),
      },
    },
    {
      name: 'alt',
      type: 'text',
      localized: true,
      label: label('Alternativtext', 'Alt text', 'النص البديل'),
      admin: {
        condition: (_, siblingData) => !siblingData?.decorative,
        description: label(
          'Beschreibt, was auf dem Bild zu sehen ist – für Menschen, die es nicht sehen können.',
          'Describes what the image shows, for people who cannot see it.',
          'يصف ما تظهره الصورة لمن لا يستطيع رؤيتها.',
        ),
      },
      validate: validateAlt,
    },
    {
      name: 'caption',
      type: 'text',
      localized: true,
      label: label('Bildunterschrift', 'Caption', 'التعليق'),
    },
    {
      name: 'credit',
      type: 'text',
      label: label('Bildnachweis', 'Image credit', 'حقوق الصورة'),
    },
  ],
}
