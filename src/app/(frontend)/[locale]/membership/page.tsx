import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { MembershipForm } from '@/components/forms/Forms'
import { CardSteps } from '@/components/sections/ContentSection'
import { NightBand } from '@/components/sections/NightBand'
import { CmsText } from '@/components/ui/CmsText'
import { Container } from '@/components/ui/Container'
import { PageHeader } from '@/components/ui/PageHeader'
import { RichText } from '@/components/ui/RichText'
import { getGlobal } from '@/lib/cms/queries'
import { resolveLocale } from '@/lib/locale-page'
import { localizedAlternates } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

// The form carries a freshly signed timestamp, so this page is rendered for every request.
export const dynamic = 'force-dynamic'

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
      <NightBand id="apply" heading={t('applyHeading')}>
        <div className="mt-8 max-w-3xl">
          <CmsText text={page.formNote} />
        </div>
        <div
          data-surface="day"
          className="mt-12 max-w-4xl rounded-card bg-surface p-6 text-ink shadow-[0_40px_120px_-40px_rgba(127,224,214,0.45)] sm:p-10 lg:p-14"
        >
          <MembershipForm locale={locale} anchor="apply" />
        </div>
      </NightBand>
    </>
  )
}
