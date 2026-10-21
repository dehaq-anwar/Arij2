import {
  BlockquoteFeature,
  BoldFeature,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  ItalicFeature,
  LinkFeature,
  lexicalEditor,
  OrderedListFeature,
  ParagraphFeature,
  UnorderedListFeature,
} from '@payloadcms/richtext-lexical'
import type { TextFieldSingleValidation } from 'payload'

import { isSafeUrl } from '@/lib/safe-url'

import { label, localizedMessage } from '../lib/labels'

/**
 * Links in texts: only web pages (https, http), e-mail, phone and paths on this site; javascript:
 * and similar addresses are refused when saving (and not rendered as links: src/lib/safe-url.ts).
 */
const safeLinkUrl: TextFieldSingleValidation = (value, { req, siblingData }) => {
  if ((siblingData as { linkType?: string } | undefined)?.linkType === 'internal') return true
  return isSafeUrl(value)
    ? true
    : localizedMessage(
        label(
          'Bitte eine Adresse eingeben, die mit https://, mailto: oder tel: beginnt, oder einen Pfad dieser Website (z. B. /kontakt).',
          'Please enter an address starting with https://, mailto: or tel:, or a path on this website (e.g. /contact).',
          'يرجى إدخال عنوان يبدأ بـ https:// أو mailto: أو tel:، أو مسار في هذا الموقع (مثل ‎/contact‎).',
        ),
        req,
      )
}

/**
 * Deliberately small feature set. Left out: text alignment and indentation (they write physical
 * left/right styles that break Arabic), embeds (third-party requests), code and tables.
 * Images belong in the dedicated image fields, where alt text is enforced.
 */
export const richTextEditor = lexicalEditor({
  features: () => [
    ParagraphFeature(),
    HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
    BoldFeature(),
    ItalicFeature(),
    LinkFeature({
      enabledCollections: ['pages', 'projects', 'news'],
      fields: ({ defaultFields }) =>
        defaultFields.map((field) =>
          'name' in field && field.name === 'url'
            ? ({ ...field, validate: safeLinkUrl } as typeof field)
            : field,
        ),
    }),
    UnorderedListFeature(),
    OrderedListFeature(),
    BlockquoteFeature(),
    HorizontalRuleFeature(),
    FixedToolbarFeature(),
    InlineToolbarFeature(),
  ],
})
