import type { Metadata } from 'next'

import { Journey } from '@/components/motion/Journey'
import { Hero } from '@/components/sections/Hero'
import {
  CallToAction,
  FocusAreasSection,
  LatestNewsSection,
  ProjectShowcase,
  StatsSection,
} from '@/components/sections/HomeSections'
import {
  getFocusAreas,
  getGlobal,
  getHomeStatistics,
  getNews,
  getProjects,
} from '@/lib/cms/queries'
import { resolveLocale } from '@/lib/locale-page'
import { localizedAlternates } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params)
  return { alternates: localizedAlternates('/', locale) }
}

/** Little text by design: name and tagline, a short journey, then projects as images. */
export default async function HomePage({ params }: Props) {
  const locale = await resolveLocale(params)
  const [home, settings, projects, areas, stats, news] = await Promise.all([
    getGlobal('home-page', locale),
    getGlobal('site-settings', locale),
    getProjects(locale),
    getFocusAreas(locale),
    getHomeStatistics(locale),
    getNews(locale, 3),
  ])
  const journey = home.journey

  return (
    <>
      <Hero headline={home.hero?.headline || 'Youth of Peace e.V.'} tagline={settings.tagline} />
      {journey?.from && journey.to ? <Journey from={journey.from} to={journey.to} /> : null}
      <ProjectShowcase projects={projects} />
      <FocusAreasSection areas={areas} />
      <StatsSection stats={stats} heading={home.statsHeading} locale={locale} />
      <LatestNewsSection posts={news} />
      <CallToAction heading={home.cta?.heading} />
    </>
  )
}
