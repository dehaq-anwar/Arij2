import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ContentSection } from '@/components/sections/ContentSection'
import { BankDetails, PartnerList } from '@/components/sections/SupportSections'
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

  return (
    <>
      <PageHeader title={nav('support')} />
      <Container className="py-12">
        <RichText data={page.intro} locale={locale} className="text-lg" />
        <ContentSection
          id="volunteer"
          heading={volunteer?.heading}
          text={volunteer?.text}
          locale={locale}
        />
        <ContentSection
          id="partner"
          heading={partner?.heading}
          text={partner?.text}
          locale={locale}
        />
        {/*
          Donations: only what the association enters. No statement on tax deductibility or
          donation receipts unless confirmed by the tax office (taxStatusNote, plan §8).
        */}
        <ContentSection id="donate" heading={donate?.heading} text={donate?.text} locale={locale}>
          <BankDetails donate={donate} />
          <RichText data={donate?.taxStatusNote} locale={locale} className="mt-6 text-sm" />
        </ContentSection>
        <PartnerList partners={partners} />
        <ButtonLink href="/contact" variant="secondary" className="mt-14">
          {t('contactCta')}
        </ButtonLink>
      </Container>
    </>
  )
}
