import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
import { PageHeader } from '@/components/ui/PageHeader'
import { RichText } from '@/components/ui/RichText'
import { TranslationNotice } from '@/components/ui/TranslationNotice'
import { Link } from '@/i18n/navigation'
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
  // Short texts are isolated with <bdi> (correct punctuation, aligned with the page); the body
  // is a left-to-right block.
  const lang = translated ? undefined : 'de'
  const dir = translated ? undefined : 'ltr'
  const period = [formatMonthYear(locale, doc.startDate), formatMonthYear(locale, doc.endDate)]
    .filter(Boolean)
    .join(' – ')
  const focusAreas = populated<FocusArea>(doc.focusAreas)
  const partners = populated<Partner>(doc.partners)
  const gallery = populated<Media>(doc.gallery)

  return (
    <article>
      <PageHeader title={doc.title} lang={lang}>
        <p lang={lang}>
          <bdi>{doc.excerpt}</bdi>
        </p>
      </PageHeader>
      <Container className="py-12">
        <p>
          <Link href="/projects">{common('backToProjects')}</Link>
        </p>
        {!translated ? (
          <div className="mt-6">
            <TranslationNotice />
          </div>
        ) : null}
        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-ink-muted">{t('stage')}</dt>
            <dd className="font-semibold">{t(`stage_${doc.stage}`)}</dd>
          </div>
          {period ? (
            <div>
              <dt className="text-sm text-ink-muted">{t('period')}</dt>
              <dd className="font-semibold">{period}</dd>
            </div>
          ) : null}
          {doc.location ? (
            <div>
              <dt className="text-sm text-ink-muted">{t('location')}</dt>
              <dd className="font-semibold">
                <bdi>{doc.location}</bdi>
              </dd>
            </div>
          ) : null}
          {focusAreas.length ? (
            <div>
              <dt className="text-sm text-ink-muted">{t('focusAreas')}</dt>
              <dd className="font-semibold">{focusAreas.map((a) => a.title).join(' · ')}</dd>
            </div>
          ) : null}
        </dl>
        <CmsImage
          media={doc.coverImage}
          sizes="(min-width: 1152px) 1152px, 100vw"
          className="mt-10 w-full rounded-lg"
          preload
        />
        <div className="mt-10" lang={lang} dir={dir}>
          <RichText data={doc.body} locale={locale} />
        </div>
        {gallery.length ? (
          <section className="mt-12" aria-labelledby="gallery-heading">
            <h2 id="gallery-heading" className="text-2xl font-bold">
              {t('gallery')}
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.map((image) => (
                <li key={image.id}>
                  <CmsImage
                    media={image}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="w-full rounded-lg"
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {partners.length ? (
          <section className="mt-12" aria-labelledby="partners-heading">
            <h2 id="partners-heading" className="text-2xl font-bold">
              {t('partners')}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {partners.map((p) => (
                <li key={p.id}>
                  <bdi>{p.url ? <a href={p.url}>{p.name}</a> : p.name}</bdi>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Container>
    </article>
  )
}
