import type { Metadata } from 'next'
import { notFound, permanentRedirect, redirect } from 'next/navigation'

import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { getCustomPage } from '@/lib/cms/pages'
import { findRedirect, visitedPath } from '@/lib/cms/redirects'
import { resolveLocale } from '@/lib/locale-page'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string; slug: string }> }

// Rendered on first visit, cached until the CMS changes.
export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const { slug } = await params
  const page = await getCustomPage(slug, locale)
  return page ? pageMetadata(page, { pathname: '/[slug]', params: { slug } }, locale) : {}
}

/** A page of the page builder with its own address (/<slug>, /en/<slug>, /ar/<slug>). */
export default async function CustomPage({ params }: Props) {
  const locale = await resolveLocale(params)
  const { slug } = await params
  const page = await getCustomPage(slug, locale)
  if (!page) {
    // An old address the editors forward somewhere else, or not found.
    const target = await findRedirect(visitedPath(locale, [slug]))
    if (target) (target.permanent ? permanentRedirect : redirect)(target.location)
    notFound()
  }
  return <RenderBlocks page={page} locale={locale} />
}
