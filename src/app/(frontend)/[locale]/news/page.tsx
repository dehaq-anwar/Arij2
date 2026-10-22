import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { NewsCard } from '@/components/cards/NewsCard'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { getNews } from '@/lib/cms/queries'
import { resolveLocale } from '@/lib/locale-page'
import { localizedAlternates } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({ locale, namespace: 'Navigation' })
  return { title: t('news'), alternates: localizedAlternates('/news', locale) }
}

export default async function NewsPage({ params }: Props) {
  const locale = await resolveLocale(params)
  const nav = await getTranslations('Navigation')
  const t = await getTranslations('NewsPage')
  const posts = await getNews(locale)

  return (
    <>
      <PageHeader title={nav('news')} />
      <div className="bg-canvas py-16 sm:py-24">
        <Container>
          {posts.length ? (
            <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map(({ doc, translated }, i) => (
                <NewsCard
                  key={doc.id}
                  post={doc}
                  translated={translated}
                  introIndex={i}
                  headingLevel={2}
                />
              ))}
            </div>
          ) : (
            <EmptyState>{t('empty')}</EmptyState>
          )}
        </Container>
      </div>
    </>
  )
}
