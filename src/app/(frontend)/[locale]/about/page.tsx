import type { Metadata } from 'next'

import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { getSystemPage } from '@/lib/cms/pages'
import { resolveLocale } from '@/lib/locale-page'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params)
  return pageMetadata(await getSystemPage('about', locale), '/about', locale)
}

export default async function AboutPage({ params }: Props) {
  const locale = await resolveLocale(params)
  const page = await getSystemPage('about', locale)
  return <RenderBlocks page={page} locale={locale} />
}
