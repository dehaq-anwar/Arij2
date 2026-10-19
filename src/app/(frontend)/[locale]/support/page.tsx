import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { CardSteps } from '@/components/sections/ContentSection'
import { NightBand } from '@/components/sections/NightBand'
import { BankDetails, PartnerList } from '@/components/sections/SupportSections'
import { FocusIcon } from '@/components/ui/FocusIcon'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Container } from '@/components/ui/Container'
import { PageHeader } from '@/components/ui/PageHeader'
import { RichText } from '@/components/ui/RichText'
import { getGlobal, getPartners } from '@/lib/cms/queries'
import { resolveLocale } from '@/lib/locale-page'
import { localizedAlternates } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({ locale, namespace: 'Navigation' })
  return { title: t('support'), alternates: localizedAlternates('/support', locale) }
}

export default async function SupportPage({ params }: Props) {
  const locale = await resolveLocale(params)
  const nav = await getTranslations('Navigation')
  const t = await getTranslations('Support')
  const [page, partners] = await Promise.all([
    getGlobal('support-page', locale),
    getPartners(locale),
  ])
  const { volunteer, partner, donate } = page
  const contact = (
    <ButtonLink href="/contact" variant="secondary" arrow>
      {t('contactCta')}
    </ButtonLink>
  )

  return (
    <>
      <PageHeader title={nav('support')} />
      <div className="bg-canvas py-20 sm:py-28">
        <Container>
          <RichText data={page.intro} locale={locale} className="text-lead mb-14 text-ink" />
          <CardSteps
            locale={locale}
            numbered={false}
            cards={[
              {
                id: 'volunteer',
                heading: volunteer?.heading,
                text: volunteer?.text,
                icon: <FocusIcon icon="community" className="size-7" />,
                footer: contact,
              },
              {
                id: 'partner',
                heading: partner?.heading,
                text: partner?.text,
                icon: <FocusIcon icon="integration" className="size-7" />,
                footer: contact,
              },
            ]}
          />
        </Container>
      </div>
      {/*
        Donations: only what the association enters. No statement on tax deductibility or
        donation receipts unless confirmed by the tax office (taxStatusNote, plan §8).
      */}
      <NightBand id="donate" heading={donate?.heading}>
        <RichText
          data={donate?.text}
          locale={locale}
          className="mt-6 text-lg text-on-night-muted"
        />
        <BankDetails donate={donate} />
        <RichText
          data={donate?.taxStatusNote}
          locale={locale}
          className="mt-8 text-sm text-on-night-muted"
        />
      </NightBand>
      <PartnerList partners={partners} />
    </>
  )
}
