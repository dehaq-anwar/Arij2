import type { Metadata } from 'next'
import { notFound, permanentRedirect, redirect } from 'next/navigation'

import { NewsArticle } from '@/components/articles/NewsArticle'
import { getNewsPost } from '@/lib/cms/queries'
import { getPathname } from '@/i18n/navigation'
import { findRedirect } from '@/lib/cms/redirects'
import { resolveLocale } from '@/lib/locale-page'
import { itemMetadata } from '@/lib/seo'

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
  return itemMetadata(result, { pathname: '/news/[slug]', params: { slug } }, locale)
}

export default async function NewsPostPage({ params }: Props) {
  const locale = await resolveLocale(params)
  const { slug } = await params
  const result = await getNewsPost(slug, locale)
  if (!result) {
    // A renamed post: the editors may forward its old address.
    const target = await findRedirect(
      getPathname({ locale, href: { pathname: '/news/[slug]', params: { slug } } }),
    )
    if (target) (target.permanent ? permanentRedirect : redirect)(target.location)
    notFound()
  }
  return <NewsArticle doc={result.doc} translated={result.translated} locale={locale} />
}
