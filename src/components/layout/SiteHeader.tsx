import { getTranslations } from 'next-intl/server'

import { ButtonLink } from '@/components/ui/ButtonLink'
import { Container } from '@/components/ui/Container'
import { membershipLink } from '@/lib/navigation'

import { LanguageSwitcher } from './LanguageSwitcher'
import { Logo } from './Logo'
import { MainNav } from './MainNav'
import { MobileMenu } from './MobileMenu'

export async function SiteHeader() {
  const t = await getTranslations('Navigation')

  return (
    <>
      {/* Language bar: always visible, also on phones, without opening the menu. Scrolls away. */}
      <div className="bg-surface text-sm">
        <Container className="flex justify-end py-0.5">
          <LanguageSwitcher />
        </Container>
      </div>

      <header className="sticky top-0 z-40 border-b border-line bg-canvas">
        <Container className="flex items-center gap-4 py-3">
          <Logo />
          <MainNav className="ms-auto hidden lg:block" />
          {/* Own wrapper: ButtonLink sets display itself, so "hidden" on it would not win. */}
          <div className="hidden lg:block">
            <ButtonLink href={membershipLink.href}>{t(membershipLink.key)}</ButtonLink>
          </div>
          <MobileMenu className="ms-auto lg:hidden">
            <MainNav orientation="vertical" />
            <ButtonLink href={membershipLink.href} className="mt-6 w-full">
              {t(membershipLink.key)}
            </ButtonLink>
          </MobileMenu>
        </Container>
      </header>
    </>
  )
}
