import { getTranslations } from 'next-intl/server'

import { CmsImage } from '@/components/ui/CmsImage'
import { Link } from '@/i18n/navigation'
import { isPlaceholder, placeholderLabel } from '@/lib/markers'
import type { Project } from '@/payload-types'

import { introDelay } from './intro'

type Props = {
  project: Project
  translated: boolean
  /** "feature": the large first tile of the home page; "tile": the regular grid card. */
  size?: 'feature' | 'tile'
  className?: string
  /** Load the image with priority (the first card when it is visible without scrolling). */
  preload?: boolean
  /**
   * Position in a list that is visible right away (list pages): the card then rises in with a
   * CSS intro from the first paint instead of waiting for a scroll reveal (<Stagger>).
   */
  introIndex?: number
}

/**
 * A project as an image with its title, nothing else (more on the project's own page).
 * The whole card is one link (its title); the image zooms slowly on hover/focus.
 * Titles that are still placeholders show without brackets, with a small "placeholder" label.
 */
export async function ProjectCard({
  project,
  translated,
  size = 'tile',
  className = '',
  preload = false,
  introIndex,
}: Props) {
  const t = await getTranslations('Common')
  const lang = translated ? undefined : 'de'
  const pending = isPlaceholder(project.title)
  return (
    <article
      data-stagger-item={introIndex === undefined ? '' : undefined}
      style={introDelay(introIndex)}
      className={`group relative isolate flex overflow-hidden rounded-card bg-night text-on-night shadow-[0_30px_60px_-40px_rgba(2,27,43,0.8)] ${introIndex === undefined ? '' : 'intro-fade'} ${className}`}
    >
      <div className="card-media absolute inset-0 -z-10">
        <CmsImage
          media={project.coverImage}
          fill
          preload={preload}
          sizes={
            size === 'feature'
              ? '(min-width: 1024px) 50vw, 85vw'
              : '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 85vw'
          }
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-t from-night/90 via-night/25 to-transparent"
      />
      <div className="mt-auto w-full p-6 sm:p-7" lang={lang} dir={lang ? 'ltr' : undefined}>
        {pending ? (
          <span className="glass mb-3 inline-block rounded-full px-3 py-1 text-xs text-on-night">
            {t('placeholder')}
          </span>
        ) : null}
        <h3
          className={`font-semibold tracking-tight text-on-night ${size === 'feature' ? 'text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.1]' : 'text-[1.375rem] leading-snug'}`}
        >
          <Link
            href={{ pathname: '/projects/[slug]', params: { slug: project.slug } }}
            className="text-on-night no-underline after:absolute after:inset-0 after:rounded-card hover:text-on-night"
          >
            <bdi>{pending ? placeholderLabel(project.title) : project.title}</bdi>
          </Link>
        </h3>
      </div>
    </article>
  )
}
