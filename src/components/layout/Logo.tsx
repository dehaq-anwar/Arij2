import Image from 'next/image'

import mark from '@/assets/logo/yop-mark.png'
import { OrgName } from '@/components/ui/OrgName'
import { Link } from '@/i18n/navigation'

/**
 * Dove mark (from the supplied PNG until the SVG arrives) plus the name as real text,
 * so it stays sharp, readable by screen readers and legible in dark mode.
 * The mark is never mirrored in RTL: logos keep their orientation.
 */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-3 text-base font-bold whitespace-nowrap sm:text-lg text-brand-navy no-underline hover:text-brand-navy dark:text-ink dark:hover:text-ink ${className}`}
    >
      <Image src={mark} alt="" width={44} height={44} loading="eager" className="size-11" />
      <OrgName />
    </Link>
  )
}
