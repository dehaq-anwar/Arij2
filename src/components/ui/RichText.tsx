import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import {
  RichText as PayloadRichText,
  type JSXConvertersFunction,
} from '@payloadcms/richtext-lexical/react'
import type { ReactNode } from 'react'

import { getPathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { isDraft, isPlaceholder } from '@/lib/markers'
import { safeHref } from '@/lib/safe-url'
import { SYSTEM_PAGE_ROUTES, type SystemPage } from '@/lib/site-routes'

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

type LinkNode = {
  children?: unknown[]
  fields: {
    linkType?: 'custom' | 'internal'
    url?: string
    newTab?: boolean
    doc?: { relationTo?: string; value?: unknown } | null
  }
}

/** Address of a link to a page, project or post of this website, in the reader's language. */
function internalHref(node: LinkNode, locale: Locale): string | undefined {
  const doc = node.fields.doc
  const value = doc && typeof doc.value === 'object' ? (doc.value as Record<string, unknown>) : null
  const slug = typeof value?.slug === 'string' ? value.slug : ''
  if (doc?.relationTo === 'pages') {
    const systemKey = value?.systemKey as SystemPage | null | undefined
    if (systemKey) return getPathname({ locale, href: SYSTEM_PAGE_ROUTES[systemKey] })
    return slug
      ? getPathname({ locale, href: { pathname: '/[slug]', params: { slug } } })
      : undefined
  }
  if (!slug) return undefined
  const pathname = doc?.relationTo === 'news' ? '/news/[slug]' : '/projects/[slug]'
  return getPathname({ locale, href: { pathname, params: { slug } } })
}

const converters =
  (locale: Locale): JSXConvertersFunction =>
  ({ defaultConverters }) => {
    // Links: internal ones in the reader's language; others only if their address is safe
    // (src/lib/safe-url.ts) — otherwise the text stays, without a link.
    const link = ({
      node,
      nodesToJSX,
    }: {
      node: LinkNode
      nodesToJSX: (args: { nodes: unknown[] }) => ReactNode[]
    }) => {
      const children = nodesToJSX({ nodes: node.children ?? [] })
      const href =
        node.fields.linkType === 'internal' ? internalHref(node, locale) : safeHref(node.fields.url)
      if (!href) return <>{children}</>
      return (
        <a
          href={href}
          target={node.fields.newTab ? '_blank' : undefined}
          rel={node.fields.newTab ? 'noopener noreferrer' : undefined}
        >
          {children}
        </a>
      )
    }
    return {
      ...defaultConverters,
      link: link as never,
      autolink: link as never,
      paragraph: (args) => {
        const text = textOf(args.node as { children?: { text?: string }[] })
        if (isPlaceholder(text) || isDraft(text)) {
          return <Placeholder variant={isDraft(text) ? 'draft' : 'placeholder'}>{text}</Placeholder>
        }
        const render = defaultConverters.paragraph
        return typeof render === 'function' ? render(args) : null
      },
    }
  }

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
