import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { CardSteps } from '@/components/sections/ContentSection'
import { NightBand } from '@/components/sections/NightBand'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { CmsText } from '@/components/ui/CmsText'
import { Container } from '@/components/ui/Container'
import { PageHeader } from '@/components/ui/PageHeader'
import { RichText } from '@/components/ui/RichText'
import { getGlobal } from '@/lib/cms/queries'
import { resolveLocale } from '@/lib/locale-page'
import { localizedAlternates } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({ locale, namespace: 'Navigation' })
  return { title: t('membership'), alternates: localizedAlternates('/membership', locale) }
}

export default async function MembershipPage({ params }: Props) {
  const locale = await resolveLocale(params)
  const nav = await getTranslations('Navigation')
  const t = await getTranslations('Membership')
  const page = await getGlobal('membership-page', locale)

  return (
    <>
      <PageHeader title={nav('membership')} />
      <div className="bg-canvas py-20 sm:py-28">
        <Container>
          <RichText data={page.intro} locale={locale} className="text-lead mb-14 text-ink" />
          <CardSteps
            locale={locale}
            cards={[
              { id: 'who-can-join', heading: t('whoCanJoinHeading'), text: page.whoCanJoin },
              { id: 'fees', heading: t('feesHeading'), text: page.fees },
              { id: 'process', heading: t('processHeading'), text: page.process },
            ]}
          />
        </Container>
      </div>
      {/* The application form (with consent and, for 16–17-year-olds, guardian consent) follows in Phase 5. */}
      <NightBand id="apply" heading={t('applyHeading')}>
        <div className="mt-8 max-w-3xl">
          <CmsText text={page.formNote} />
        </div>
        <ButtonLink href="/contact" variant="light" arrow className="mt-10">
          {t('contactCta')}
        </ButtonLink>
      </NightBand>
    </>
  )
}
