import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import {
  LinkJSXConverter,
  RichText as PayloadRichText,
  type JSXConvertersFunction,
} from '@payloadcms/richtext-lexical/react'

import { getPathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { isDraft, isPlaceholder } from '@/lib/markers'

import { Placeholder } from './Placeholder'

type Data = SerializedEditorState | Record<string, unknown> | null | undefined

/** Text of a paragraph node (for placeholder/draft detection). */
const textOf = (node: { children?: { text?: string }[] }) =>
  (node.children ?? []).map((c) => c.text ?? '').join('')

/** True when the editor state contains any text. */
export function hasRichText(data: Data): boolean {
  const children = (data as SerializedEditorState | undefined)?.root?.children ?? []
  return children.some(
    (node) => textOf(node as { children?: { text?: string }[] }).trim().length > 0,
  )
}

const converters =
  (locale: Locale): JSXConvertersFunction =>
  ({ defaultConverters }) => ({
    ...defaultConverters,
    ...LinkJSXConverter({
      internalDocToHref: ({ linkNode }) => {
        const doc = linkNode.fields.doc
        const slug =
          doc && typeof doc.value === 'object'
            ? String((doc.value as { slug?: string }).slug ?? '')
            : ''
        const pathname = doc?.relationTo === 'news' ? '/news/[slug]' : '/projects/[slug]'
        return getPathname({ locale, href: { pathname, params: { slug } } })
      },
    }),
    paragraph: (args) => {
      const text = textOf(args.node as { children?: { text?: string }[] })
      if (isPlaceholder(text) || isDraft(text)) {
        return <Placeholder variant={isDraft(text) ? 'draft' : 'placeholder'}>{text}</Placeholder>
      }
      const render = defaultConverters.paragraph
      return typeof render === 'function' ? render(args) : null
    },
  })

/**
 * CMS rich text as React elements (never raw HTML). Text alignment and indentation from the
 * editor are ignored: they are physical (left/right) and would break the Arabic layout.
 */
export function RichText({
  data,
  locale,
  className = '',
}: {
  data: Data
  locale: Locale
  className?: string
}) {
  if (!hasRichText(data)) return null
  return (
    <PayloadRichText
      data={data as SerializedEditorState}
      converters={converters(locale)}
      disableTextAlign
      disableIndent
      className={`prose-yop ${className}`}
    />
  )
}
