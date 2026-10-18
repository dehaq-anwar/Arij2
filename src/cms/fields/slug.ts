import type { TextField, TextFieldSingleValidation } from 'payload'

import { slugify, SLUG_PATTERN } from '@/lib/slugify'

import { label, localizedMessage } from '../lib/labels'

const validateSlug: TextFieldSingleValidation = (value, { req }) =>
  typeof value === 'string' && SLUG_PATTERN.test(value)
    ? true
    : localizedMessage(
        label(
          'Bitte ein URL-Kürzel aus Kleinbuchstaben, Ziffern und Bindestrichen eingeben (z. B. „friedenscamp-2026“).',
          'Please enter a URL slug of lowercase letters, digits and hyphens (e.g. "peace-camp-2026").',
          'يرجى إدخال معرّف رابط من أحرف لاتينية صغيرة وأرقام وشرطات (مثل «peace-camp-2026»).',
        ),
        req,
      )

/** One Latin slug per document, shared by all languages (the language switcher maps 1:1). */
export const slugField = (): TextField => ({
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  label: label('URL-Kürzel', 'URL slug', 'المعرّف في الرابط'),
  admin: {
    position: 'sidebar',
    description: label(
      'Wird aus dem Titel erzeugt, wenn es leer bleibt. Gilt für alle Sprachen.',
      'Generated from the title when left empty. Shared by all languages.',
      'يُولَّد من العنوان إذا تُرك فارغًا، وهو مشترك بين كل اللغات.',
    ),
  },
  hooks: {
    beforeValidate: [
      ({ value, siblingData }) => {
        if (typeof value === 'string' && value.trim()) return slugify(value)
        const title = (siblingData as { title?: unknown } | undefined)?.title
        return typeof title === 'string' ? slugify(title) || undefined : value
      },
    ],
  },
  validate: validateSlug,
})
