'use client'

import { useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import type { Href, MenuEntry } from '@/lib/links'
import { prefetchFor } from '@/lib/navigation'

type Props = { items: MenuEntry[]; orientation?: 'horizontal' | 'vertical'; className?: string }

/** The menu entries from the CMS (src/lib/cms/navigation.ts); the current page is marked. */
export function MainNav({ items, orientation = 'horizontal', className = '' }: Props) {
  const t = useTranslations('Navigation')
  const pathname = usePathname()
  const vertical = orientation === 'vertical'
  const linkClass = vertical
    ? 'block py-2 text-[2rem] leading-tight font-medium text-on-night no-underline hover:text-glow data-current:text-glow'
    : 'relative block rounded-full px-3.5 py-2 whitespace-nowrap text-[0.95rem] text-current no-underline opacity-90 transition-opacity hover:text-current hover:opacity-100 data-current:opacity-100 after:absolute after:inset-x-3.5 after:bottom-1 after:h-0.5 after:origin-[var(--origin)] after:scale-x-0 after:rounded-full after:bg-current after:transition-transform after:duration-300 hover:after:scale-x-100 data-current:after:scale-x-100 [--origin:left] rtl:[--origin:right]'

  return (
    <nav
      aria-label={t('mainLabel')}
      data-main-nav={vertical ? undefined : ''}
      className={className}
    >
      <ul className={vertical ? 'flex flex-col gap-1' : 'flex items-center gap-1'}>
        {items.map((item) => {
          // "page" on the section's own page, "true" on its sub-pages (e.g. a single project).
          const current = !item.match
            ? undefined
            : pathname === item.match
              ? 'page'
              : item.match !== '/' && pathname.startsWith(`${item.match}/`)
                ? 'true'
                : undefined
          return (
            <li key={item.id} data-menu-item={vertical ? '' : undefined}>
              {item.external ? (
                <a href={item.href as string} rel="noopener noreferrer" className={linkClass}>
                  {item.label}
                </a>
              ) : (
                <Link
                  href={item.href as Href}
                  prefetch={prefetchFor(item.href)}
                  aria-current={current}
                  data-current={current ? '' : undefined}
                  className={linkClass}
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
