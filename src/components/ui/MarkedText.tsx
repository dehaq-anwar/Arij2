import { getTranslations } from 'next-intl/server'

import { draftLabel, isDraft, isPlaceholder, placeholderLabel } from '@/lib/markers'

type Props = {
  text: string | null | undefined
  as?: 'p' | 'span' | 'div'
  className?: string
}

/**
 * CMS text for prominent places (statements, cards): a draft or placeholder keeps its visible
 * marker, as a small label in front of the text instead of a dashed frame. Nothing if empty.
 */
export async function MarkedText({ text, as: Tag = 'p', className = '' }: Props) {
  if (!text?.trim()) return null
  const t = await getTranslations('Common')
  const variant = isPlaceholder(text) ? 'placeholder' : isDraft(text) ? 'draft' : null
  if (!variant) return <Tag className={className}>{text}</Tag>
  return (
    <Tag className={className}>
      <span
        data-placeholder={variant}
        className="me-2 inline-block rounded-full border border-dashed border-current px-2.5 align-middle text-[0.75rem] leading-6 font-medium"
      >
        {variant === 'draft' ? t('draft') : t('placeholder')}
      </span>
      {variant === 'draft' ? draftLabel(text) : placeholderLabel(text)}
    </Tag>
  )
}
