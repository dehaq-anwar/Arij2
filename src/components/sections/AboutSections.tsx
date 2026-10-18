import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/motion/Reveal'
import { Stagger } from '@/components/motion/Stagger'
import { CmsImage } from '@/components/ui/CmsImage'
import { CmsText } from '@/components/ui/CmsText'
import { Placeholder } from '@/components/ui/Placeholder'
import type { AboutPage, TeamMember } from '@/payload-types'

export async function Timeline({ story }: { story: AboutPage['story'] }) {
  if (!story?.length) return null
  const t = await getTranslations('About')
  return (
    <Reveal as="section" className="mt-16">
      <h2 className="text-2xl font-bold sm:text-3xl">{t('storyHeading')}</h2>
      <ol className="mt-8 space-y-8 border-s-2 border-brand ps-6">
        {story.map((entry) => (
          <li key={entry.id} className="relative">
            <span
              aria-hidden="true"
              className="absolute -start-[1.95rem] top-1.5 size-3 rounded-full bg-brand"
            />
            {entry.year ? <p className="font-semibold text-accent">{entry.year}</p> : null}
            <h3 className="text-lg font-bold">
              <CmsText as="span" text={entry.title} />
            </h3>
            <div className="mt-2">
              <CmsText text={entry.text} className="text-ink-muted" />
            </div>
          </li>
        ))}
      </ol>
    </Reveal>
  )
}

export async function ValuesGrid({ values }: { values: AboutPage['values'] }) {
  if (!values?.length) return null
  const t = await getTranslations('About')
  return (
    <section className="mt-16" aria-labelledby="values-heading">
      <Reveal>
        <h2 id="values-heading" className="text-2xl font-bold sm:text-3xl">
          {t('valuesHeading')}
        </h2>
      </Reveal>
      <Stagger as="ul" className="mt-8 grid gap-6 sm:grid-cols-2">
        {values.map((value) => (
          <li key={value.id} data-stagger-item className="rounded-lg border border-line-strong p-6">
            <h3 className="text-lg font-bold">{value.title}</h3>
            <div className="mt-3">
              <CmsText text={value.description} className="text-ink-muted" />
            </div>
          </li>
        ))}
      </Stagger>
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
    <section className="mt-16" aria-labelledby="board-heading">
      <Reveal>
        <h2 id="board-heading" className="text-2xl font-bold sm:text-3xl">
          {t('boardHeading')}
        </h2>
        <CmsText text={intro} className="mt-4 max-w-3xl text-ink-muted" />
      </Reveal>
      {members.length ? (
        <Stagger as="ul" className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <li key={member.id} data-stagger-item className="rounded-lg bg-surface p-6">
              <CmsImage
                media={member.photo}
                sizes="(min-width: 1024px) 33vw, 100vw"
                className="mb-4 aspect-square w-32 rounded-full object-cover"
              />
              <h3 className="text-lg font-bold">
                <bdi>{member.name}</bdi>
              </h3>
              <p className="text-accent">{member.position}</p>
              <CmsText text={member.bio} className="mt-3 text-sm text-ink-muted" />
            </li>
          ))}
        </Stagger>
      ) : (
        <div className="mt-6 max-w-3xl">
          <Placeholder>{t('boardEmpty')}</Placeholder>
        </div>
      )}
    </section>
  )
}
