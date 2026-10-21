import type { Metadata } from 'next'

import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { getSystemPage } from '@/lib/cms/pages'
import { resolveLocale } from '@/lib/locale-page'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const page = await getSystemPage('home', locale)
  return pageMetadata(page, '/', locale, { useTitle: false })
}

/** Little text by design: name and tagline, a short journey, then projects as images. */
export default async function HomePage({ params }: Props) {
  const locale = await resolveLocale(params)
  const page = await getSystemPage('home', locale)
  return <RenderBlocks page={page} locale={locale} />
}
