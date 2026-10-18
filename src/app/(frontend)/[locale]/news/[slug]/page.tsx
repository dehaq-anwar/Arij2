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
import { getNewsPost } from '@/lib/cms/queries'
import { formatDate } from '@/lib/format'
import { resolveLocale } from '@/lib/locale-page'
import { localizedAlternates } from '@/lib/seo'
import type { Project } from '@/payload-types'

type Props = { params: Promise<{ locale: string; slug: string }> }

// Rendered on first visit, cached until the CMS changes.
export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const { slug } = await params
  const result = await getNewsPost(slug, locale)
  if (!result) return {}
  const { doc, available } = result
  return {
    title: doc.seo?.metaTitle || doc.title,
    description: doc.seo?.metaDescription || doc.excerpt,
    alternates: localizedAlternates(
      { pathname: '/news/[slug]', params: { slug } },
      locale,
      available,
    ),
  }
}

export default async function NewsPostPage({ params }: Props) {
  const locale = await resolveLocale(params)
  const { slug } = await params
  const result = await getNewsPost(slug, locale)
  if (!result) notFound()
  const { doc, translated } = result
  const t = await getTranslations('NewsPage')
  const common = await getTranslations('Common')
  // Untranslated items show the German text, marked as German for screen readers and hyphenation.
  // Short texts are isolated with <bdi> (correct punctuation, aligned with the page); the body
  // is a left-to-right block.
  const lang = translated ? undefined : 'de'
  const dir = translated ? undefined : 'ltr'
  const related = populated<Project>(doc.relatedProjects)

  return (
    <article>
      <PageHeader title={doc.title} lang={lang}>
        {doc.publishedAt ? (
          <p className="text-base">
            <time dateTime={doc.publishedAt}>
              {common('publishedOn', { date: formatDate(locale, doc.publishedAt) })}
            </time>
          </p>
        ) : null}
        <p className="mt-2" lang={lang}>
          <bdi>{doc.excerpt}</bdi>
        </p>
      </PageHeader>
      <Container className="py-12">
        <p>
          <Link href="/news">{common('backToNews')}</Link>
        </p>
        {!translated ? (
          <div className="mt-6">
            <TranslationNotice />
          </div>
        ) : null}
        <CmsImage
          media={doc.coverImage}
          sizes="(min-width: 1152px) 1152px, 100vw"
          className="mt-10 w-full rounded-lg"
          preload
        />
        <div className="mt-10" lang={lang} dir={dir}>
          <RichText data={doc.body} locale={locale} />
        </div>
        {related.length ? (
          <section className="mt-12" aria-labelledby="related-heading">
            <h2 id="related-heading" className="text-2xl font-bold">
              {t('relatedProjects')}
            </h2>
            <ul className="mt-4 space-y-2">
              {related.map((project) => (
                <li key={project.id}>
                  <Link href={{ pathname: '/projects/[slug]', params: { slug: project.slug } }}>
                    <bdi>{project.title}</bdi>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Container>
    </article>
  )
}
