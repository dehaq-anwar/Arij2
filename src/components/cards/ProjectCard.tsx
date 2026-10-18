import { getTranslations } from 'next-intl/server'

import { CmsImage } from '@/components/ui/CmsImage'
import { Link } from '@/i18n/navigation'
import type { Project } from '@/payload-types'

/**
 * The whole card is one link (its heading); the hover effect is CSS only.
 * React Bits slot: SpotlightCard (added once the repository is private).
 */
export async function ProjectCard({
  project,
  translated,
}: {
  project: Project
  translated: boolean
}) {
  const t = await getTranslations('Projects')
  const lang = translated ? undefined : 'de'
  return (
    <article
      data-stagger-item
      className="group relative flex flex-col overflow-hidden rounded-lg border border-line-strong bg-canvas transition-colors hover:border-accent"
    >
      <CmsImage
        media={project.coverImage}
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="aspect-[3/2] w-full object-cover"
      />
      <div className="flex flex-1 flex-col p-6" lang={lang} dir={lang ? 'ltr' : undefined}>
        <p className="text-sm font-semibold text-accent">{t(`stage_${project.stage}`)}</p>
        <h3 className="mt-2 text-lg font-bold">
          <Link
            href={{ pathname: '/projects/[slug]', params: { slug: project.slug } }}
            className="text-ink no-underline after:absolute after:inset-0 hover:text-accent"
          >
            <bdi>{project.title}</bdi>
          </Link>
        </h3>
        <p className="mt-3 text-ink-muted">{project.excerpt}</p>
      </div>
    </article>
  )
}
