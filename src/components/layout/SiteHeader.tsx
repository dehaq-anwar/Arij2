import { getLocale } from 'next-intl/server'

import { ButtonLink, buttonClass } from '@/components/ui/ButtonLink'
import { Container } from '@/components/ui/Container'
import type { Locale } from '@/i18n/routing'
import { getMenu } from '@/lib/cms/navigation'
import type { Href } from '@/lib/links'

import { HeaderShell } from './HeaderShell'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Logo } from './Logo'
import { MainNav } from './MainNav'
import { MobileMenu } from './MobileMenu'

export async function SiteHeader() {
  const { main, cta } = await getMenu((await getLocale()) as Locale)
  const ctaClass =
    'min-h-11 px-5 py-2 group-data-[tone=day]/header:bg-accent group-data-[tone=day]/header:text-on-accent group-data-[tone=night]/header:bg-on-night group-data-[tone=night]/header:text-night'

  return (
    <HeaderShell>
      {/* Language links: always visible, also on phones, without opening the menu. */}
      <Container className="flex h-8 items-center justify-end text-[0.8125rem]">
        <LanguageSwitcher />
      </Container>
      <Container className="flex h-16 items-center gap-4 lg:h-[4.75rem]">
        <Logo className="shrink-0" />
        {/* Below 1024 px, and wherever the menu does not fit (HeaderShell measures it), the
            menu button replaces the menu and the highlighted button. */}
        <MainNav
          items={main}
          className="ms-auto hidden min-w-0 lg:block lg:group-data-[menu=compact]/header:hidden"
        />
        {/* Own wrapper: ButtonLink sets display itself, so "hidden" on it would not win. */}
        <div className="hidden shrink-0 lg:block lg:group-data-[menu=compact]/header:hidden">
          {cta.external ? (
            <a href={cta.href as string} className={buttonClass('primary', ctaClass)}>
              {cta.label}
            </a>
          ) : (
            <ButtonLink href={cta.href as Href} className={ctaClass}>
              {cta.label}
            </ButtonLink>
          )}
        </div>
        <MobileMenu
          className="ms-auto lg:hidden lg:group-data-[menu=compact]/header:block"
          items={main}
          cta={cta}
        />
      </Container>
    </HeaderShell>
  )
}
