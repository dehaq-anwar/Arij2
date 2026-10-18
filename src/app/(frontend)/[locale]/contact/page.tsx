import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PlaceholderPage } from '@/components/sections/PlaceholderPage'
import { resolveLocale } from '@/lib/locale-page'
import { localizedAlternates } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({ locale, namespace: 'Navigation' })
  return { title: t('contact'), alternates: localizedAlternates('/contact', locale) }
}

export default async function ContactPage({ params }: Props) {
  await resolveLocale(params)
  const nav = await getTranslations('Navigation')
  const t = await getTranslations('Placeholder')
  return <PlaceholderPage title={nav('contact')} text={t('pageContent')} />
}
