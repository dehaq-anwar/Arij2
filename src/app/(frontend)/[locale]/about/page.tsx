import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { BoardGrid, Timeline, ValuesGrid } from '@/components/sections/AboutSections'
import { Container } from '@/components/ui/Container'
import { PageHeader } from '@/components/ui/PageHeader'
import { RichText } from '@/components/ui/RichText'
import { getBoard, getGlobal } from '@/lib/cms/queries'
import { resolveLocale } from '@/lib/locale-page'
import { localizedAlternates } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({ locale, namespace: 'Navigation' })
  return { title: t('about'), alternates: localizedAlternates('/about', locale) }
}

export default async function AboutPage({ params }: Props) {
  const locale = await resolveLocale(params)
  const nav = await getTranslations('Navigation')
  const [about, board] = await Promise.all([getGlobal('about-page', locale), getBoard(locale)])

  return (
    <>
      <PageHeader title={nav('about')} />
      <Container className="py-12">
        <RichText data={about.intro} locale={locale} className="text-lg" />
        <Timeline story={about.story} />
        <ValuesGrid values={about.values} />
        <BoardGrid members={board} intro={about.boardIntro} />
      </Container>
    </>
  )
}
