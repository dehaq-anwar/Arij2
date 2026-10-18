'use client'

import { useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { mainNav } from '@/lib/navigation'

type Props = { orientation?: 'horizontal' | 'vertical'; className?: string }

export function MainNav({ orientation = 'horizontal', className = '' }: Props) {
  const t = useTranslations('Navigation')
  const pathname = usePathname()
  const vertical = orientation === 'vertical'

  return (
    <nav aria-label={t('mainLabel')} className={className}>
      <ul className={vertical ? 'flex flex-col gap-1' : 'flex items-center gap-1'}>
        {mainNav.map(({ href, key }) => {
          // "page" on the section's own page, "true" on its sub-pages (e.g. a single project).
          const current =
            pathname === href ? 'page' : pathname.startsWith(`${href}/`) ? 'true' : undefined
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current}
                data-current={current ? '' : undefined}
                className={`block rounded-md px-3 py-2.5 font-medium text-ink no-underline hover:bg-surface hover:text-ink data-current:text-accent data-current:underline data-current:decoration-2 data-current:underline-offset-8 ${vertical ? 'text-xl' : ''}`}
              >
                {t(key)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
