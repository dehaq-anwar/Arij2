import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { Stagger } from '@/components/motion/Stagger'
import { MediaHero } from '@/components/sections/MediaHero'
import { CmsImage } from '@/components/ui/CmsImage'
import { CmsText } from '@/components/ui/CmsText'
import { Container } from '@/components/ui/Container'
import { RichText } from '@/components/ui/RichText'
import { TranslationNotice } from '@/components/ui/TranslationNotice'
import { populated } from '@/lib/cms/populated'
import { getProject } from '@/lib/cms/queries'
import { formatMonthYear } from '@/lib/format'
import { resolveLocale } from '@/lib/locale-page'
import { localizedAlternates } from '@/lib/seo'
import type { FocusArea, Media, Partner } from '@/payload-types'

type Props = { params: Promise<{ locale: string; slug: string }> }

// Rendered on first visit, cached until the CMS changes.
export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const { slug } = await params
  const result = await getProject(slug, locale)
  if (!result) return {}
  const { doc, available } = result
  return {
    title: doc.seo?.metaTitle || doc.title,
    description: doc.seo?.metaDescription || doc.excerpt,
    alternates: localizedAlternates(
      { pathname: '/projects/[slug]', params: { slug } },
      locale,
      available,
    ),
  }
}

export default async function ProjectPage({ params }: Props) {
  const locale = await resolveLocale(params)
  const { slug } = await params
  const result = await getProject(slug, locale)
  if (!result) notFound()
  const { doc, translated } = result
  const t = await getTranslations('Projects')
  const common = await getTranslations('Common')
  // Untranslated items show the German text, marked as German for screen readers and hyphenation.
  const lang = translated ? undefined : 'de'
  const dir = translated ? undefined : 'ltr'
  const period = [formatMonthYear(locale, doc.startDate), formatMonthYear(locale, doc.endDate)]
    .filter(Boolean)
    .join(' – ')
  const focusAreas = populated<FocusArea>(doc.focusAreas)
  const partners = populated<Partner>(doc.partners)
  const gallery = populated<Media>(doc.gallery)
  const facts = [
    doc.stage ? { key: 'stage', label: t('stage'), value: t(`stage_${doc.stage}`) } : null,
    period ? { key: 'period', label: t('period'), value: period } : null,
    doc.location ? { key: 'location', label: t('location'), value: doc.location } : null,
    focusAreas.length
      ? { key: 'focus', label: t('focusAreas'), value: focusAreas.map((a) => a.title).join(' · ') }
      : null,
  ].filter((fact) => fact !== null)

  return (
    <article>
      <MediaHero
        image={doc.coverImage}
        title={doc.title}
        lang={lang}
        back={{ href: '/projects', label: common('backToProjects') }}
      >
        <CmsText text={doc.excerpt} as="span" />
      </MediaHero>
      <div className="bg-canvas py-16 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-20">
          <div>
            {!translated ? (
              <div className="mb-10">
                <TranslationNotice />
              </div>
            ) : null}
            <div lang={lang} dir={dir}>
              <RichText data={doc.body} locale={locale} className="text-lg" />
            </div>
          </div>
          {facts.length || partners.length ? (
            <aside className="self-start rounded-card bg-surface p-7 shadow-[0_24px_50px_-36px_rgba(4,50,78,0.45)] lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
              {facts.length ? (
                <dl className="space-y-5">
                  {facts.map((fact) => (
                    <div key={fact.key}>
                      <dt className="text-sm text-ink-muted">{fact.label}</dt>
                      <dd className="mt-0.5 font-medium">
                        <bdi>{fact.value}</bdi>
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {partners.length ? (
                <section
                  className={facts.length ? 'mt-6 border-t border-line pt-6' : ''}
                  aria-labelledby="partners-heading"
                >
                  <h2 id="partners-heading" className="text-sm font-normal text-ink-muted">
                    {t('partners')}
                  </h2>
                  <ul className="mt-2 space-y-1">
                    {partners.map((p) => (
                      <li key={p.id} className="font-medium">
                        <bdi>{p.url ? <a href={p.url}>{p.name}</a> : p.name}</bdi>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </aside>
          ) : null}
        </Container>
        {gallery.length ? (
          <Container className="mt-20">
            <section aria-labelledby="gallery-heading">
              <h2 id="gallery-heading" className="text-heading">
                {t('gallery')}
              </h2>
              <Stagger as="ul" className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {gallery.map((image) => (
                  <li
                    key={image.id}
                    data-stagger-item
                    className="card-media group relative aspect-[4/3] overflow-hidden rounded-card"
                  >
                    <CmsImage
                      media={image}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    />
                  </li>
                ))}
              </Stagger>
            </section>
          </Container>
        ) : null}
      </div>
    </article>
  )
}
