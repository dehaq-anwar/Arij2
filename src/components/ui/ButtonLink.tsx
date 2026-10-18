import type { ComponentProps } from 'react'

import { Link } from '@/i18n/navigation'

type Props = ComponentProps<typeof Link> & { variant?: 'primary' | 'secondary' }

const base =
  'inline-flex min-h-11 items-center justify-center rounded-md px-5 py-2.5 font-semibold no-underline transition-colors'

const variants = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover hover:text-on-accent',
  secondary:
    'border border-accent bg-canvas text-accent hover:border-accent-hover hover:bg-surface hover:text-accent-hover',
}

export function ButtonLink({ variant = 'primary', className = '', ...props }: Props) {
  return <Link {...props} className={`${base} ${variants[variant]} ${className}`} />
}
