import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { LegalPage } from '@/components/sections/LegalPage'
import { getGlobal } from '@/lib/cms/queries'
import { resolveLocale } from '@/lib/locale-page'
import { localizedAlternates } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({ locale, namespace: 'Navigation' })
  return { title: t('privacy'), alternates: localizedAlternates('/privacy', locale) }
}

export default async function PrivacyPage({ params }: Props) {
  const locale = await resolveLocale(params)
  const nav = await getTranslations('Navigation')
  const t = await getTranslations('Placeholder')
  const page = await getGlobal('privacy-policy', locale)
  return (
    <LegalPage
      title={nav('privacy')}
      content={page.content}
      lastUpdated={page.lastUpdated}
      placeholder={t('privacy')}
      locale={locale}
    />
  )
}
