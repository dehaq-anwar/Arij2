import type { CSSProperties } from 'react'

import { splitForAnimation } from '@/lib/split'

type Props = {
  text: string
  as?: 'h1' | 'h2' | 'p'
  className?: string
  lang?: string
  /** Delay before the first character, in characters (each step is 28 ms). */
  offset?: number
}

/**
 * A headline whose characters (or Arabic words) rise in with a CSS animation from the very first
 * paint. Screen readers get the plain text via aria-label; the split spans are hidden from them.
 * With reduced motion the text simply stands still.
 *
 * Split pieces are inline blocks, which the bidi algorithm treats as neutral: Latin words (and
 * all-Latin headlines) therefore get dir="ltr", so they never read backwards on Arabic pages.
 */
export function SplitHeading({ text, as: Tag = 'h1', className = '', lang, offset = 0 }: Props) {
  let i = offset
  const split = splitForAnimation(text)
  return (
    <Tag aria-label={text} lang={lang} dir={split.arabic ? undefined : 'ltr'} className={className}>
      {split.words.map((word, w) => (
        <span key={w}>
          <span
            aria-hidden="true"
            className="split-word"
            dir={split.arabic && !word.arabic ? 'ltr' : undefined}
          >
            {word.units.map((unit, u) => (
              <span key={u} className="split-unit" style={{ '--i': i++ } as CSSProperties}>
                {unit}
              </span>
            ))}
          </span>
          {w < split.words.length - 1 ? ' ' : null}
        </span>
      ))}
    </Tag>
  )
}
