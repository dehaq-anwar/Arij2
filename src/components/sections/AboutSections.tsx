import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/motion/Reveal'
import { Stagger } from '@/components/motion/Stagger'
import { Atmosphere } from '@/components/ui/Atmosphere'
import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
import { FocusIcon } from '@/components/ui/FocusIcon'
import { MarkedText } from '@/components/ui/MarkedText'
import { Placeholder } from '@/components/ui/Placeholder'
import { RichText } from '@/components/ui/RichText'
import type { Locale } from '@/i18n/routing'
import type { AboutPage, FocusArea, TeamMember } from '@/payload-types'

/** The mission as one large statement, followed by the introduction. */
export async function MissionIntro({ about, locale }: { about: AboutPage; locale: Locale }) {
  return (
    <section className="bg-canvas py-20 sm:py-28">
      <Container>
        <Reveal>
          <MarkedText text={about.mission} className="text-heading max-w-5xl text-ink" />
        </Reveal>
        <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_minmax(0,40rem)]">
          <span aria-hidden="true" className="hidden h-px self-start bg-line lg:mt-4 lg:block" />
          <RichText data={about.intro} locale={locale} className="text-lg text-ink-muted" />
        </div>
      </Container>
    </section>
  )
}

/** History as a line of stations on a night band (horizontal on large screens). */
export async function Timeline({ story }: { story: AboutPage['story'] }) {
  if (!story?.length) return null
  const t = await getTranslations('About')
  return (
    <section
      data-surface="night"
      aria-labelledby="story-heading"
      className="relative isolate overflow-hidden bg-night py-24 text-on-night sm:py-32"
    >
      <Atmosphere variant="band" />
      <Container>
        <Reveal variant="slide-start">
          <h2 id="story-heading" className="text-heading">
            {t('storyHeading')}
          </h2>
        </Reveal>
        <Stagger
          as="ol"
          className="mt-14 grid gap-10 border-s border-on-night/20 ps-8 lg:grid-flow-col lg:auto-cols-fr lg:border-s-0 lg:border-t lg:ps-0 lg:pt-10"
        >
          {story.map((entry) => (
            <li key={entry.id} data-stagger-item className="relative">
              <span
                aria-hidden="true"
                className="absolute -start-[2.4rem] top-2 size-3 rounded-full bg-glow shadow-[0_0_18px_var(--color-glow)] lg:start-0 lg:-top-[2.95rem]"
              />
              {entry.year ? (
                <p className="text-5xl font-semibold tracking-tight text-glow">{entry.year}</p>
              ) : null}
              <h3 className="mt-3 text-xl font-semibold">
                <MarkedText as="span" text={entry.title} />
              </h3>
              <MarkedText text={entry.text} className="mt-2 max-w-md text-on-night-muted" />
            </li>
          ))}
        </Stagger>
      </Container>
    </section>
  )
}

export async function ValuesGrid({ values }: { values: AboutPage['values'] }) {
  if (!values?.length) return null
  const t = await getTranslations('About')
  return (
    <section className="bg-canvas py-24 sm:py-32" aria-labelledby="values-heading">
      <Container>
        <Reveal variant="slide-start">
          <h2 id="values-heading" className="text-heading">
            {t('valuesHeading')}
          </h2>
        </Reveal>
        <Stagger as="ul" className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {values.map((value, i) => (
            <li
              key={value.id}
              data-stagger-item
              data-spotlight
              className="relative isolate overflow-hidden rounded-card bg-surface p-7 shadow-[0_24px_50px_-36px_rgba(4,50,78,0.45)]"
            >
              <p aria-hidden="true" className="relative text-sm font-medium text-accent">
                {String(i + 1).padStart(2, '0')}
              </p>
              <h3 className="relative mt-6 text-xl font-semibold">{value.title}</h3>
              <MarkedText text={value.description} className="relative mt-3 text-ink-muted" />
            </li>
          ))}
        </Stagger>
      </Container>
    </section>
  )
}

/** The focus areas with their short descriptions (the home page shows names only). */
export async function FocusAreasDetail({ areas }: { areas: FocusArea[] }) {
  if (!areas.length) return null
  const t = await getTranslations('Home')
  return (
    <section className="bg-surface-sky/60 py-24 sm:py-32" aria-labelledby="focus-heading">
      <Container>
        <Reveal variant="slide-start">
          <h2 id="focus-heading" className="text-heading">
            {t('focusHeading')}
          </h2>
        </Reveal>
        <Stagger as="ul" className="mt-12 grid gap-4 sm:grid-cols-2 lg:gap-5">
          {areas.map((area) => (
            <li key={area.id} data-stagger-item className="flex gap-5 rounded-card bg-surface p-7">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-surface-sky text-accent">
                <FocusIcon icon={area.icon} className="size-7" />
              </span>
              <div>
                <h3 className="text-xl font-semibold">{area.title}</h3>
                <MarkedText text={area.summary} className="mt-2 text-ink-muted" />
              </div>
            </li>
          ))}
        </Stagger>
      </Container>
    </section>
  )
}

/** Only people with recorded consent are returned by the CMS. */
export async function BoardGrid({
  members,
  intro,
}: {
  members: TeamMember[]
  intro?: string | null
}) {
  const t = await getTranslations('About')
  return (
    <section className="bg-canvas py-24 sm:py-32" aria-labelledby="board-heading">
      <Container>
        <Reveal variant="slide-start">
          <h2 id="board-heading" className="text-heading">
            {t('boardHeading')}
          </h2>
          <MarkedText text={intro} className="mt-5 max-w-3xl text-ink-muted" />
        </Reveal>
        {members.length ? (
          <Stagger as="ul" className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {members.map((member) => (
              <li key={member.id} data-stagger-item className="rounded-card bg-surface p-6">
                <div className="card-media relative mb-5 aspect-square overflow-hidden rounded-[1.25rem] bg-surface-sky">
                  <CmsImage media={member.photo} fill sizes="(min-width: 1024px) 25vw, 50vw" />
                </div>
                <h3 className="text-lg font-semibold">
                  <bdi>{member.name}</bdi>
                </h3>
                <p className="text-accent">{member.position}</p>
                <MarkedText text={member.bio} className="mt-3 text-sm text-ink-muted" />
              </li>
            ))}
          </Stagger>
        ) : (
          <div className="mt-8 max-w-3xl">
            <Placeholder>{t('boardEmpty')}</Placeholder>
          </div>
        )}
      </Container>
    </section>
  )
}
