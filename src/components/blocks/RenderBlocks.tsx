import { Journey } from '@/components/motion/Journey'
import {
  BoardGrid,
  FocusAreasDetail,
  MissionIntro,
  Timeline,
  ValuesGrid,
} from '@/components/sections/AboutSections'
import { Hero } from '@/components/sections/Hero'
import {
  CallToAction,
  FocusAreasSection,
  LatestNewsSection,
  ProjectShowcase,
  StatsSection,
} from '@/components/sections/HomeSections'
import { MediaHero } from '@/components/sections/MediaHero'
import { PartnerList } from '@/components/sections/SupportSections'
import { PageHeader } from '@/components/ui/PageHeader'
import type { Locale } from '@/i18n/routing'
import {
  getBoard,
  getFocusAreas,
  getGlobal,
  getHomeStatistics,
  getNews,
  getPartners,
  getProjects,
  getUpcomingEvents,
} from '@/lib/cms/queries'
import type { Page } from '@/payload-types'

import { UpcomingEventsSection } from './events-section'
import { ContactFormSection, MembershipFormSection } from './form-sections'
import {
  CardsSection,
  DonationSection,
  FaqSection,
  GallerySection,
  ImageTextSection,
  NightBandSection,
  QuoteSection,
  TextSection,
} from './sections'

type Block = Page['layout'][number]

/** Loads only what the blocks on the page need (each query is cached for the request). */
async function sources(layout: Block[], locale: Locale) {
  const has = (type: Block['blockType']) => layout.some((block) => block.blockType === type)
  const [settings, projects, news, events, areas, stats, board, partners] = await Promise.all([
    getGlobal('site-settings', locale),
    has('projects') ? getProjects(locale) : [],
    has('news') ? getNews(locale, 6) : [],
    has('events') ? getUpcomingEvents(locale, 4) : [],
    has('focusAreas') ? getFocusAreas(locale) : [],
    has('stats') ? getHomeStatistics(locale) : [],
    has('board') ? getBoard(locale) : [],
    has('partners') ? getPartners(locale) : [],
  ])
  return { settings, projects, news, events, areas, stats, board, partners }
}

/**
 * A page of the page builder: each block becomes its section of the design system, in the
 * order the editors chose. Unknown block types (e.g. from a newer version) are skipped.
 */
export async function RenderBlocks({
  page,
  locale,
}: {
  page: Pick<Page, 'title' | 'layout'>
  locale: Locale
}) {
  const layout = page.layout ?? []
  const data = await sources(layout, locale)
  let donations = 0

  return (
    <>
      {layout.map((block, i) => {
        const key = block.id ?? `${block.blockType}-${i}`
        const anchor = `block-${i + 1}`
        switch (block.blockType) {
          case 'header':
            return (
              <PageHeader key={key} title={block.title || page.title}>
                {block.lead || (block.showTagline ? data.settings.tagline : null)}
              </PageHeader>
            )
          case 'hero':
            return (
              <Hero
                key={key}
                headline={block.headline || page.title}
                tagline={block.showTagline ? data.settings.tagline : null}
                buttons={block.buttons ?? []}
              />
            )
          case 'mediaHeader':
            return (
              <MediaHero key={key} image={block.image} title={block.title || page.title}>
                {block.lead}
              </MediaHero>
            )
          case 'text':
            return <TextSection key={key} block={block} anchor={anchor} locale={locale} />
          case 'cards':
            return <CardsSection key={key} block={block} anchor={anchor} locale={locale} />
          case 'imageText':
            return <ImageTextSection key={key} block={block} anchor={anchor} locale={locale} />
          case 'statement':
            return (
              <MissionIntro
                key={key}
                statement={block.statement}
                body={block.body}
                locale={locale}
              />
            )
          case 'quote':
            return <QuoteSection key={key} block={block} anchor={anchor} locale={locale} />
          case 'faq':
            return <FaqSection key={key} block={block} anchor={anchor} locale={locale} />
          case 'gallery':
            return <GallerySection key={key} block={block} anchor={anchor} locale={locale} />
          case 'timeline':
            return (
              <Timeline
                key={key}
                story={block.entries}
                heading={block.heading}
                id={`${anchor}-heading`}
              />
            )
          case 'values':
            return (
              <ValuesGrid
                key={key}
                values={block.items}
                heading={block.heading}
                id={`${anchor}-heading`}
              />
            )
          case 'journey':
            return block.from && block.to ? (
              <Journey key={key} from={block.from} to={block.to} />
            ) : null
          case 'nightBand':
            return <NightBandSection key={key} block={block} anchor={anchor} locale={locale} />
          case 'callToAction':
            return <CallToAction key={key} heading={block.heading} buttons={block.buttons ?? []} />
          case 'donation':
            donations++
            return (
              <DonationSection
                key={key}
                block={block}
                anchor={donations === 1 ? 'donate' : anchor}
                locale={locale}
              />
            )
          case 'projects':
            return <ProjectShowcase key={key} projects={data.projects} heading={block.heading} />
          case 'news':
            return (
              <LatestNewsSection
                key={key}
                posts={data.news.slice(0, Number(block.count) || 3)}
                heading={block.heading}
              />
            )
          case 'events':
            return (
              <UpcomingEventsSection
                key={key}
                events={data.events.slice(0, Number(block.count) || 2)}
                heading={block.heading}
                id={`${anchor}-heading`}
              />
            )
          case 'focusAreas':
            return block.variant === 'details' ? (
              <FocusAreasDetail
                key={key}
                areas={data.areas}
                heading={block.heading}
                id={`${anchor}-heading`}
              />
            ) : (
              <FocusAreasSection
                key={key}
                areas={data.areas}
                heading={block.heading}
                id={`${anchor}-heading`}
              />
            )
          case 'stats':
            return (
              <StatsSection key={key} stats={data.stats} heading={block.heading} locale={locale} />
            )
          case 'board':
            return (
              <BoardGrid
                key={key}
                members={data.board}
                intro={block.intro}
                heading={block.heading}
                id={`${anchor}-heading`}
              />
            )
          case 'partners':
            return (
              <PartnerList
                key={key}
                partners={data.partners}
                heading={block.heading}
                id={`${anchor}-heading`}
              />
            )
          case 'membershipForm':
            return <MembershipFormSection key={key} block={block} locale={locale} />
          case 'contactForm':
            return (
              <ContactFormSection
                key={key}
                block={block}
                settings={data.settings}
                locale={locale}
              />
            )
          default:
            return null
        }
      })}
    </>
  )
}
