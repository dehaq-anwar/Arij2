import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { ProjectCard } from '@/components/cards/ProjectCard'
import { Stagger } from '@/components/motion/Stagger'
import { MediaHero } from '@/components/sections/MediaHero'
import { CmsText } from '@/components/ui/CmsText'
import { Container } from '@/components/ui/Container'
import { RichText } from '@/components/ui/RichText'
import { TranslationNotice } from '@/components/ui/TranslationNotice'
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
  const lang = translated ? undefined : 'de'
  const dir = translated ? undefined : 'ltr'
  const related = populated<Project>(doc.relatedProjects)

  return (
    <article>
      <MediaHero
        image={doc.coverImage}
        title={doc.title}
        lang={lang}
        back={{ href: '/news', label: common('backToNews') }}
        eyebrow={
          doc.publishedAt ? (
            <time dateTime={doc.publishedAt}>
              {common('publishedOn', { date: formatDate(locale, doc.publishedAt) })}
            </time>
          ) : undefined
        }
      >
        <CmsText text={doc.excerpt} as="span" />
      </MediaHero>
      <div className="bg-canvas py-16 sm:py-24">
        <Container>
          <div className="mx-auto max-w-3xl">
            {!translated ? (
              <div className="mb-10">
                <TranslationNotice />
              </div>
            ) : null}
            <div lang={lang} dir={dir}>
              <RichText data={doc.body} locale={locale} className="text-lg" />
            </div>
          </div>
        </Container>
        {related.length ? (
          <Container className="mt-20">
            <section aria-labelledby="related-heading">
              <h2 id="related-heading" className="text-heading">
                {t('relatedProjects')}
              </h2>
              <Stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    translated
                    className="aspect-[4/5]"
                  />
                ))}
              </Stagger>
            </section>
          </Container>
        ) : null}
      </div>
    </article>
  )
}
