import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ProjectCard } from '@/components/cards/ProjectCard'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { getProjects } from '@/lib/cms/queries'
import { resolveLocale } from '@/lib/locale-page'
import { localizedAlternates } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({ locale, namespace: 'Navigation' })
  return { title: t('projects'), alternates: localizedAlternates('/projects', locale) }
}

export default async function ProjectsPage({ params }: Props) {
  const locale = await resolveLocale(params)
  const nav = await getTranslations('Navigation')
  const t = await getTranslations('Projects')
  const projects = await getProjects(locale)

  return (
    <>
      <PageHeader title={nav('projects')} />
      <div className="bg-canvas py-16 sm:py-24">
        <Container>
          {projects.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:gap-6">
              {projects.map(({ doc, translated }, i) => (
                <ProjectCard
                  key={doc.id}
                  project={doc}
                  translated={translated}
                  size={i === 0 ? 'feature' : 'tile'}
                  preload={i === 0}
                  introIndex={i}
                  headingLevel={2}
                  className={
                    i === 0
                      ? 'aspect-[4/5] sm:col-span-2 sm:aspect-[21/9]'
                      : 'aspect-[4/5] sm:aspect-[4/3]'
                  }
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
