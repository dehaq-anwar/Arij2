import type { CSSProperties } from 'react'

/** Staggered CSS intro delay for cards visible right away (capped, so long lists don't wait). */
export const introDelay = (index: number | undefined): CSSProperties | undefined =>
  index === undefined
    ? undefined
    : ({ '--delay': `${Math.min(index, 5) * 90 + 150}ms` } as CSSProperties)
