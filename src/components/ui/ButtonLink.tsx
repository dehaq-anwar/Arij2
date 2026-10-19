import type { ComponentProps } from 'react'

import { Link } from '@/i18n/navigation'

type Variant = 'primary' | 'secondary' | 'light' | 'glass'
type Props = ComponentProps<typeof Link> & { variant?: Variant; arrow?: boolean }

const base =
  'group/button inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full px-6 py-3 font-medium no-underline transition-[background-color,color,border-color,box-shadow] duration-300'

const variants: Record<Variant, string> = {
  // On day backgrounds
  primary: 'bg-accent text-on-accent hover:bg-accent-hover hover:text-on-accent',
  secondary: 'border border-accent bg-transparent text-accent hover:bg-accent hover:text-on-accent',
  // On night backgrounds
  light:
    'bg-on-night text-night shadow-[0_10px_40px_-12px_rgba(127,224,214,0.55)] hover:bg-glow-strong hover:text-night',
  glass: 'glass text-on-night hover:bg-on-night hover:text-night',
}

// The arrow nudges forward on hover: to the right in German/English, to the left in Arabic.
const arrowClass =
  'size-4 transition-transform duration-300 group-hover/button:translate-x-1 rtl:-scale-x-100 rtl:group-hover/button:-translate-x-1' // logical-css-ok: mirrored with rtl:

/** Pill-shaped link button. The optional arrow points in reading direction (mirrored in Arabic). */
export function ButtonLink({
  variant = 'primary',
  arrow = false,
  className = '',
  children,
  ...props
}: Props) {
  return (
    <Link {...props} className={`${base} ${variants[variant]} ${className}`}>
      {children}
      {arrow ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={arrowClass}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12h15M13 6l6 6-6 6" />
        </svg>
      ) : null}
    </Link>
  )
}
