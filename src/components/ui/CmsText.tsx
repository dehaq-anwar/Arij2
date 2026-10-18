import { isDraft, isPlaceholder } from '@/lib/markers'

import { Placeholder } from './Placeholder'

/** Margin utilities from a class list (e.g. "mt-4 text-lg" → "mt-4"). */
const spacing = (className: string) =>
  className
    .split(/\s+/)
    .filter((c) => /^-?m[tbsexy]?-/.test(c))
    .join(' ')

type Props = {
  text: string | null | undefined
  as?: 'p' | 'span' | 'div'
  className?: string
}

/**
 * Plain CMS text. Placeholders and drafts are rendered as visible markers (keeping the
 * spacing classes, but not the text colour or size). Nothing if empty.
 */
export function CmsText({ text, as: Tag = 'p', className = '' }: Props) {
  if (!text?.trim()) return null
  if (isPlaceholder(text) || isDraft(text)) {
    return (
      <Placeholder
        inline={Tag === 'span'}
        variant={isDraft(text) ? 'draft' : 'placeholder'}
        className={spacing(className)}
      >
        {text}
      </Placeholder>
    )
  }
  return <Tag className={className}>{text}</Tag>
}
