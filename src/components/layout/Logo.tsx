import Image from 'next/image'

import logoLight from '@/assets/logo/yop-logo-light.png'
import logo from '@/assets/logo/yop-logo.png'
import { OrgName } from '@/components/ui/OrgName'
import { Link } from '@/i18n/navigation'

/**
 * Logo mark (from the association's PSD) plus the name as real text, so it stays sharp and
 * readable by screen readers. On night backgrounds the navy figure turns white ("light"); in
 * the header both variants are rendered and CSS shows the one matching the header's tone.
 * The mark is never mirrored in RTL: logos keep their orientation.
 */
export function Logo({
  tone = 'auto',
  className = '',
}: {
  tone?: 'auto' | 'night' | 'day'
  className?: string
}) {
  const mark = (src: typeof logo, extra: string) => (
    <Image src={src} alt="" height={40} loading="eager" className={`h-9 w-auto sm:h-10 ${extra}`} />
  )
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-3 text-[0.95rem] font-semibold whitespace-nowrap text-current no-underline hover:text-current sm:text-base ${className}`}
    >
      {tone === 'night' ? mark(logoLight, '') : null}
      {tone === 'day' ? mark(logo, '') : null}
      {tone === 'auto' ? (
        <>
          {mark(logoLight, 'logo-on-night')}
          {mark(logo, 'logo-on-day')}
        </>
      ) : null}
      <OrgName />
    </Link>
  )
}
