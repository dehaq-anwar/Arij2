import { getTranslations } from 'next-intl/server'

import { BlockButtons, type LinkValue } from '@/components/blocks/BlockButton'
import { NewsCard } from '@/components/cards/NewsCard'
import { ProjectCard } from '@/components/cards/ProjectCard'
import { Reveal } from '@/components/motion/Reveal'
import { Stagger } from '@/components/motion/Stagger'
import { Atmosphere } from '@/components/ui/Atmosphere'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Container } from '@/components/ui/Container'
import { FocusIcon } from '@/components/ui/FocusIcon'
import type { Locale } from '@/i18n/routing'
import type { Localized } from '@/lib/cms/queries'
import { formatDate, formatNumber } from '@/lib/format'
import type { FocusArea, News, Project, Statistic } from '@/payload-types'

/** Section title row: heading sliding in from the reading start, optional link at the end. */
async function SectionHead({
  title,
  link,
}: {
  title: string
  link?: { href: '/projects' | '/news'; label: string }
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <Reveal variant="slide-start">
        <h2 className="text-heading">{title}</h2>
      </Reveal>
      {link ? (
        <ButtonLink href={link.href} variant="secondary" arrow>
          {link.label}
        </ButtonLink>
      ) : null}
    </div>
  )
}

/**
 * Projects as images with titles. Five fill a mosaic on large screens (one large tile, four
 * small); on phones they become a row to swipe through.
 */
export async function ProjectShowcase({
  projects,
  heading,
}: {
  projects: Localized<Project>[]
  heading?: string | null
}) {
  if (!projects.length) return null
  const nav = await getTranslations('Navigation')
  const t = await getTranslations('Common')
  const mosaic = projects.length >= 5
  return (
    <section className="bg-canvas py-24 sm:py-32">
      <Container>
        <SectionHead
          title={heading || nav('projects')}
          link={{ href: '/projects', label: t('allProjects') }}
        />
      </Container>
      <Stagger
        className={`mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 [scrollbar-width:thin] sm:px-8 lg:mx-auto lg:grid lg:max-w-[84rem] lg:snap-none lg:gap-5 lg:overflow-visible lg:px-12 lg:pb-0 ${mosaic ? 'lg:auto-rows-[19rem] lg:grid-cols-4' : 'lg:grid-cols-3'}`}
      >
        {projects.slice(0, 5).map(({ doc, translated }, i) => (
          <ProjectCard
            key={doc.id}
            project={doc}
            translated={translated}
            size={mosaic && i === 0 ? 'feature' : 'tile'}
            className={`aspect-[4/5] w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-auto ${mosaic ? (i === 0 ? 'lg:col-span-2 lg:row-span-2 lg:aspect-auto' : 'lg:aspect-auto') : 'lg:aspect-[4/5]'}`}
          />
        ))}
      </Stagger>
    </section>
  )
}

/** The four focus areas: icon and name only. */
export async function FocusAreasSection({
  areas,
  heading,
  id = 'focus-heading',
}: {
  areas: FocusArea[]
  heading?: string | null
  id?: string
}) {
  if (!areas.length) return null
  const t = await getTranslations('Home')
  return (
    <section aria-labelledby={id} className="bg-surface-sky/60 py-24 sm:py-32">
      <Container>
        <Reveal variant="slide-start">
          <h2 id={id} className="text-heading">
            {heading || t('focusHeading')}
          </h2>
        </Reveal>
        <Stagger as="ul" className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {areas.map((area) => (
            <li
              key={area.id}
              data-stagger-item
              data-spotlight
              className="relative isolate flex min-h-56 flex-col justify-between overflow-hidden rounded-card bg-surface p-7 shadow-[0_24px_50px_-36px_rgba(4,50,78,0.45)]"
            >
              <span className="relative grid size-14 place-items-center rounded-full bg-surface-sky text-accent ring-1 ring-accent/15">
                <FocusIcon icon={area.icon} className="size-7" />
              </span>
              <h3 className="relative text-xl leading-snug font-semibold">{area.title}</h3>
            </li>
          ))}
        </Stagger>
      </Container>
    </section>
  )
}

/** Real, CMS-maintained figures only; the section is absent when there are none. */
export async function StatsSection({
  stats,
  heading,
  locale,
}: {
  stats: Statistic[]
  heading?: string | null
  locale: Locale
}) {
  if (!stats.length) return null
  const t = await getTranslations('Common')
  return (
    <section className="bg-canvas py-24 sm:py-28">
      <Container>
        {heading ? (
          <Reveal variant="slide-start">
            <h2 className="text-heading">{heading}</h2>
          </Reveal>
        ) : null}
        <Stagger as="dl" className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.id} data-stagger-item className="rounded-card bg-surface p-7">
              <dt className="text-ink-muted">{stat.label}</dt>
              <dd className="mt-3 text-5xl font-semibold tracking-tight text-accent">
                {stat.prefix}
                {formatNumber(locale, stat.value)}
                {stat.suffix}
              </dd>
              <dd className="mt-3 text-sm text-ink-muted">
                {t('asOf', { date: formatDate(locale, stat.asOf) })}
              </dd>
            </div>
          ))}
        </Stagger>
      </Container>
    </section>
  )
}

/** Shown only when posts exist: the home page never shows an empty "no news" box. */
export async function LatestNewsSection({
  posts,
  heading,
}: {
  posts: Localized<News>[]
  heading?: string | null
}) {
  if (!posts.length) return null
  const t = await getTranslations('Home')
  const common = await getTranslations('Common')
  return (
    <section className="bg-canvas py-24 sm:py-32">
      <Container>
        <SectionHead
          title={heading || t('newsHeading')}
          link={{ href: '/news', label: common('allNews') }}
        />
        <Stagger className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {posts.map(({ doc, translated }) => (
            <NewsCard key={doc.id} post={doc} translated={translated} />
          ))}
        </Stagger>
      </Container>
    </section>
  )
}

/** Closing night band before the footer: one heading, ways to take part. */
export async function CallToAction({
  heading,
  buttons,
}: {
  heading?: string | null
  /** The page builder's buttons; without them, the three usual ways in. */
  buttons?: LinkValue[] | null
}) {
  const nav = await getTranslations('Navigation')
  return (
    <section
      data-surface="night"
      className="relative isolate overflow-hidden bg-night text-on-night"
    >
      <Atmosphere variant="band" />
      <Container className="py-28 text-center sm:py-36">
        <Reveal>
          {heading ? <h2 className="text-title">{heading}</h2> : null}
          {buttons ? (
            <BlockButtons buttons={buttons} surface="night" className="mt-10 justify-center" />
          ) : (
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/membership" variant="light" arrow>
                {nav('membership')}
              </ButtonLink>
              <ButtonLink href="/support" variant="glass">
                {nav('support')}
              </ButtonLink>
              <ButtonLink href="/contact" variant="glass">
                {nav('contact')}
              </ButtonLink>
            </div>
          )}
        </Reveal>
      </Container>
    </section>
  )
}
