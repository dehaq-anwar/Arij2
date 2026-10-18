import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/motion/Reveal'
import { Stagger } from '@/components/motion/Stagger'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Container } from '@/components/ui/Container'
import { OrgName } from '@/components/ui/OrgName'
import { Placeholder } from '@/components/ui/Placeholder'
import { resolveLocale } from '@/lib/locale-page'
import { localizedAlternates } from '@/lib/seo'

// Phase 3 home: the final section structure with placeholder content and the motion primitives.
// Phase 4 fills it from the CMS (HomePage global, FocusAreas, News, Statistics).

const focusAreas = [
  'focusYouthEmpowerment',
  'focusPeacebuilding',
  'focusIntegration',
  'focusEntrepreneurship',
] as const

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params)
  return { alternates: localizedAlternates('/', locale) }
}

export default async function HomePage({ params }: Props) {
  await resolveLocale(params)
  const t = await getTranslations('Home')
  const nav = await getTranslations('Navigation')
  const footer = await getTranslations('Footer')

  return (
    <>
      {/* Hero: above the fold, so no scroll reveal (the headline is the LCP element). */}
      <section className="bg-surface">
        <Container className="py-16 sm:py-24">
          <h1 className="max-w-3xl text-4xl font-bold text-brand-navy sm:text-5xl dark:text-ink">
            <OrgName />
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-muted sm:text-xl">{footer('founded')}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <ButtonLink href="/membership">{nav('membership')}</ButtonLink>
            <ButtonLink href="/support" variant="secondary">
              {nav('support')}
            </ButtonLink>
          </div>
        </Container>
      </section>

      <Container className="py-16">
        <Reveal as="section" className="max-w-3xl">
          <h2 className="text-2xl font-bold sm:text-3xl">{t('missionHeading')}</h2>
          <div className="mt-4">
            <Placeholder>{t('mission')}</Placeholder>
          </div>
        </Reveal>
      </Container>

      <section aria-labelledby="focus-heading" className="border-y border-line">
        <Container className="py-16">
          <Reveal variant="slide-start">
            <h2 id="focus-heading" className="text-2xl font-bold sm:text-3xl">
              {t('focusHeading')}
            </h2>
          </Reveal>
          <Stagger as="ul" className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {focusAreas.map((key) => (
              <li
                key={key}
                data-stagger-item
                className="rounded-lg border border-line-strong bg-canvas p-6"
              >
                <h3 className="text-lg font-bold">{t(key)}</h3>
                <div className="mt-3 text-sm">
                  <Placeholder>{t('focusSummary')}</Placeholder>
                </div>
              </li>
            ))}
          </Stagger>
        </Container>
      </section>

      <Container className="py-16">
        <Reveal as="section">
          <h2 className="text-2xl font-bold sm:text-3xl">{t('newsHeading')}</h2>
          <p className="mt-4 text-ink-muted">{t('newsEmpty')}</p>
        </Reveal>
      </Container>

      <section className="bg-surface-sky">
        <Container className="py-16">
          <Reveal className="max-w-3xl">
            <h2 className="text-2xl font-bold sm:text-3xl">{t('ctaHeading')}</h2>
            <div className="mt-4">
              <Placeholder>{t('ctaText')}</Placeholder>
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <ButtonLink href="/membership">{nav('membership')}</ButtonLink>
              <ButtonLink href="/support" variant="secondary">
                {nav('support')}
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  )
}
