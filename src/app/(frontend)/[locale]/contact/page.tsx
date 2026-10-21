import type { Metadata } from 'next'

import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { getSystemPage } from '@/lib/cms/pages'
import { resolveLocale } from '@/lib/locale-page'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

// The form carries a freshly signed timestamp, so this page is rendered for every request.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params)
  return pageMetadata(await getSystemPage('contact', locale), '/contact', locale)
}

export default async function ContactPage({ params }: Props) {
  const locale = await resolveLocale(params)
  const page = await getSystemPage('contact', locale)
  return <RenderBlocks page={page} locale={locale} />
}
