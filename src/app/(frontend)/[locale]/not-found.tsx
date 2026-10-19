import { getTranslations } from 'next-intl/server'
import type { CSSProperties } from 'react'

import { Atmosphere } from '@/components/ui/Atmosphere'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Container } from '@/components/ui/Container'
import { SplitHeading } from '@/components/ui/SplitHeading'

export default async function NotFound() {
  const t = await getTranslations('NotFound')
  return (
    <section
      data-surface="night"
      className="relative isolate flex min-h-[85svh] flex-col overflow-hidden bg-night text-on-night"
    >
      <Atmosphere variant="hero" />
      <Container className="flex flex-1 flex-col items-center justify-center pt-[calc(var(--header-h)+2rem)] pb-24 text-center">
        <p
          aria-hidden="true"
          className="intro-fade text-[clamp(6rem,22vw,16rem)] leading-none font-semibold tracking-tighter text-glow/30"
        >
          404
        </p>
        <SplitHeading text={t('title')} className="text-heading -mt-4 sm:-mt-10" />
        <p
          className="intro-fade text-lead mt-6 max-w-xl text-on-night-muted"
          style={{ '--delay': '400ms' } as CSSProperties}
        >
          {t('text')}
        </p>
        <div className="intro-fade mt-10" style={{ '--delay': '550ms' } as CSSProperties}>
          <ButtonLink href="/" variant="light" arrow>
            {t('backHome')}
          </ButtonLink>
        </div>
      </Container>
    </section>
  )
}
