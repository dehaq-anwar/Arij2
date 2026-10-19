import { getTranslations } from 'next-intl/server'

import { ButtonLink } from '@/components/ui/ButtonLink'
import { Container } from '@/components/ui/Container'
import { membershipLink } from '@/lib/navigation'

import { HeaderShell } from './HeaderShell'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Logo } from './Logo'
import { MainNav } from './MainNav'
import { MobileMenu } from './MobileMenu'

export async function SiteHeader() {
  const t = await getTranslations('Navigation')

  return (
    <HeaderShell>
      {/* Language links: always visible, also on phones, without opening the menu. */}
      <Container className="flex h-8 items-center justify-end text-[0.8125rem]">
        <LanguageSwitcher />
      </Container>
      <Container className="flex h-16 items-center gap-4 lg:h-[4.75rem]">
        <Logo />
        <MainNav className="ms-auto hidden lg:block" />
        {/* Own wrapper: ButtonLink sets display itself, so "hidden" on it would not win. */}
        <div className="hidden lg:block">
          <ButtonLink
            href={membershipLink.href}
            className="min-h-11 px-5 py-2 group-data-[tone=day]/header:bg-accent group-data-[tone=day]/header:text-on-accent group-data-[tone=night]/header:bg-on-night group-data-[tone=night]/header:text-night"
          >
            {t(membershipLink.key)}
          </ButtonLink>
        </div>
        <MobileMenu className="ms-auto lg:hidden" ctaLabel={t(membershipLink.key)} />
      </Container>
    </HeaderShell>
  )
}
