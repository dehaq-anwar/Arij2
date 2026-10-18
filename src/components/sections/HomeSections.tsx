import { getTranslations } from 'next-intl/server'

import { NewsCard } from '@/components/cards/NewsCard'
import { Reveal } from '@/components/motion/Reveal'
import { Stagger } from '@/components/motion/Stagger'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { CmsText } from '@/components/ui/CmsText'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { FocusIcon } from '@/components/ui/FocusIcon'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { formatDate, formatNumber } from '@/lib/format'
import type { Localized } from '@/lib/cms/queries'
import type { FocusArea, News, Statistic } from '@/payload-types'

export async function MissionSection({ mission }: { mission?: string | null }) {
  if (!mission) return null
  const t = await getTranslations('Home')
  return (
    <Container className="py-16">
      <Reveal as="section" className="max-w-3xl">
        <h2 className="text-2xl font-bold sm:text-3xl">{t('missionHeading')}</h2>
        <CmsText text={mission} className="mt-4 text-xl leading-relaxed" />
      </Reveal>
    </Container>
  )
}

export async function FocusAreasSection({
  areas,
  intro,
}: {
  areas: FocusArea[]
  intro?: string | null
}) {
  if (!areas.length) return null
  const t = await getTranslations('Home')
  return (
    <section aria-labelledby="focus-heading" className="border-y border-line">
      <Container className="py-16">
        <Reveal variant="slide-start">
          <h2 id="focus-heading" className="text-2xl font-bold sm:text-3xl">
            {t('focusHeading')}
          </h2>
          <CmsText text={intro} className="mt-4 max-w-3xl text-ink-muted" />
        </Reveal>
        <Stagger as="ul" className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {areas.map((area) => (
            <li
              key={area.id}
              data-stagger-item
              className="rounded-lg border border-line-strong bg-canvas p-6"
            >
              <FocusIcon icon={area.icon} className="size-10 text-brand" />
              <h3 className="mt-4 text-lg font-bold">{area.title}</h3>
              <div className="mt-3 text-sm">
                <CmsText text={area.summary} className="text-ink-muted" />
              </div>
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
    <Container className="py-16">
      <Reveal as="section">
        {heading ? <h2 className="text-2xl font-bold sm:text-3xl">{heading}</h2> : null}
        {/* React Bits slot: CountUp for the numbers (the final value stays in the HTML). */}
        <dl className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.id} className="rounded-lg bg-surface p-6">
              <dt className="text-ink-muted">{stat.label}</dt>
              <dd className="mt-2 text-4xl font-bold text-brand-navy dark:text-ink">
                {stat.prefix}
                {formatNumber(locale, stat.value)}
                {stat.suffix}
              </dd>
              <dd className="mt-2 text-sm text-ink-muted">
                {t('asOf', { date: formatDate(locale, stat.asOf) })}
              </dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </Container>
  )
}

export async function LatestNewsSection({ posts }: { posts: Localized<News>[] }) {
  const t = await getTranslations('Home')
  const common = await getTranslations('Common')
  const page = await getTranslations('NewsPage')
  return (
    <Container className="py-16">
      <Reveal as="section">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-bold sm:text-3xl">{t('newsHeading')}</h2>
          {posts.length ? (
            <Link href="/news" className="font-semibold">
              {common('allNews')}
            </Link>
          ) : null}
        </div>
        {posts.length ? (
          <Stagger className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map(({ doc, translated }) => (
              <NewsCard key={doc.id} post={doc} translated={translated} />
            ))}
          </Stagger>
        ) : (
          <div className="mt-6">
            <EmptyState>{page('empty')}</EmptyState>
          </div>
        )}
      </Reveal>
    </Container>
  )
}

export async function CallToAction({
  heading,
  text,
}: {
  heading?: string | null
  text?: string | null
}) {
  const nav = await getTranslations('Navigation')
  return (
    <section className="bg-surface-sky">
      <Container className="py-16">
        <Reveal className="max-w-3xl">
          {heading ? <h2 className="text-2xl font-bold sm:text-3xl">{heading}</h2> : null}
          <CmsText text={text} className="mt-4 text-lg" />
          <div className="mt-8 flex flex-wrap gap-4">
            <ButtonLink href="/membership">{nav('membership')}</ButtonLink>
            <ButtonLink href="/support" variant="secondary">
              {nav('support')}
            </ButtonLink>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
