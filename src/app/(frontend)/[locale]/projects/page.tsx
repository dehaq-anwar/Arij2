import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ProjectCard } from '@/components/cards/ProjectCard'
import { Stagger } from '@/components/motion/Stagger'
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
      <Container className="py-12">
        {projects.length ? (
          <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map(({ doc, translated }) => (
              <ProjectCard key={doc.id} project={doc} translated={translated} />
            ))}
          </Stagger>
        ) : (
          <EmptyState>{t('empty')}</EmptyState>
        )}
      </Container>
    </>
  )
}
