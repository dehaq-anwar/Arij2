import type { Metadata } from 'next'

import { Hero } from '@/components/sections/Hero'
import {
  CallToAction,
  FocusAreasSection,
  LatestNewsSection,
  MissionSection,
  StatsSection,
} from '@/components/sections/HomeSections'
import { getFocusAreas, getGlobal, getHomeStatistics, getNews } from '@/lib/cms/queries'
import { resolveLocale } from '@/lib/locale-page'
import { localizedAlternates } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params)
  return { alternates: localizedAlternates('/', locale) }
}

export default async function HomePage({ params }: Props) {
  const locale = await resolveLocale(params)
  const [home, areas, stats, news] = await Promise.all([
    getGlobal('home-page', locale),
    getFocusAreas(locale),
    getHomeStatistics(locale),
    getNews(locale, 3),
  ])

  return (
    <>
      <Hero headline={home.hero?.headline || 'Youth of Peace e.V.'} subline={home.hero?.subline} />
      <MissionSection mission={home.mission} />
      <FocusAreasSection areas={areas} intro={home.focusIntro} />
      <StatsSection stats={stats} heading={home.statsHeading} locale={locale} />
      <LatestNewsSection posts={news} />
      <CallToAction heading={home.cta?.heading} text={home.cta?.text} />
    </>
  )
}
