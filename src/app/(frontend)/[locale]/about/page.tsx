import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import {
  BoardGrid,
  FocusAreasDetail,
  MissionIntro,
  Timeline,
  ValuesGrid,
} from '@/components/sections/AboutSections'
import { PageHeader } from '@/components/ui/PageHeader'
import { getBoard, getFocusAreas, getGlobal } from '@/lib/cms/queries'
import { resolveLocale } from '@/lib/locale-page'
import { localizedAlternates } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({ locale, namespace: 'Navigation' })
  return { title: t('about'), alternates: localizedAlternates('/about', locale) }
}

export default async function AboutPage({ params }: Props) {
  const locale = await resolveLocale(params)
  const nav = await getTranslations('Navigation')
  const [about, settings, areas, board] = await Promise.all([
    getGlobal('about-page', locale),
    getGlobal('site-settings', locale),
    getFocusAreas(locale),
    getBoard(locale),
  ])

  return (
    <>
      <PageHeader title={nav('about')}>{settings.tagline}</PageHeader>
      <MissionIntro about={about} locale={locale} />
      <Timeline story={about.story} />
      <ValuesGrid values={about.values} />
      <FocusAreasDetail areas={areas} />
      <BoardGrid members={board} intro={about.boardIntro} />
    </>
  )
}
