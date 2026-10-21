import type { Metadata } from 'next'
import { notFound, permanentRedirect, redirect } from 'next/navigation'

import { EventArticle } from '@/components/articles/EventArticle'
import { getEvent } from '@/lib/cms/queries'
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
  const result = await getEvent(slug, locale)
  if (!result) return {}
  return itemMetadata(result, { pathname: '/events/[slug]', params: { slug } }, locale)
}

export default async function EventPage({ params }: Props) {
  const locale = await resolveLocale(params)
  const { slug } = await params
  const result = await getEvent(slug, locale)
  if (!result) {
    // A renamed event: the editors may forward its old address.
    const target = await findRedirect(
      getPathname({ locale, href: { pathname: '/events/[slug]', params: { slug } } }),
    )
    if (target) (target.permanent ? permanentRedirect : redirect)(target.location)
    notFound()
  }
  return <EventArticle doc={result.doc} translated={result.translated} locale={locale} />
}
