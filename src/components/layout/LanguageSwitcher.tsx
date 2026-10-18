'use client'

import { useLocale, useTranslations } from 'next-intl'
import NextLink from 'next/link'
import { useParams } from 'next/navigation'

import { localeNames } from '@/i18n/locale'
import { getPathname, usePathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

/**
 * Plain links (crawlable, work without JavaScript) to the same page in the other languages.
 * Each language is named in its own language and marked with lang/hrefLang. The targets come from
 * getPathname(), like the hreflang alternates, so German links are canonical ("/ueber-uns", not
 * "/de/ueber-uns" — next-intl only adds that prefix to refresh its locale cookie, which we don't use).
 */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const t = useTranslations('LanguageSwitcher')
  const current = useLocale()
  const pathname = usePathname()
  // Route params of the current page (e.g. a project slug); the locale is set separately.
  const { locale: _locale, ...params } = useParams()

  return (
    <nav aria-label={t('label')} className={className}>
      <ul className="flex items-center gap-1">
        {routing.locales.map((locale) =>
          locale === current ? (
            <li key={locale}>
              <span
                aria-current="true"
                lang={locale}
                className="block px-2 py-1.5 font-semibold text-ink"
              >
                {localeNames[locale]}
              </span>
            </li>
          ) : (
            <li key={locale}>
              <NextLink
                href={getPathname({
                  locale,
                  // @ts-expect-error -- pathname and params come from the current route, so they always match
                  href: { pathname, params },
                })}
                lang={locale}
                hrefLang={locale}
                prefetch={false}
                className="block rounded px-2 py-1.5 text-ink-muted underline-offset-4 hover:text-accent hover:underline"
              >
                {localeNames[locale]}
              </NextLink>
            </li>
          ),
        )}
      </ul>
    </nav>
  )
}
