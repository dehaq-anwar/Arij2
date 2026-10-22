import { getLocale, getTranslations } from 'next-intl/server'

import { CmsImage } from '@/components/ui/CmsImage'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { formatDate } from '@/lib/format'
import type { News } from '@/payload-types'

import { introDelay } from './intro'

/** A post as image, date and title (the text is on the post's own page). */
export async function NewsCard({
  post,
  translated,
  introIndex,
  headingLevel = 3,
}: {
  post: News
  translated: boolean
  /** See ProjectCard: CSS intro for lists that are visible right away. */
  introIndex?: number
  /** The title's heading level: 2 directly under the page title (list page), else 3. */
  headingLevel?: 2 | 3
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  const t = await getTranslations('Common')
  const locale = (await getLocale()) as Locale
  const lang = translated ? undefined : 'de'
  return (
    <article
      data-stagger-item={introIndex === undefined ? '' : undefined}
      style={introDelay(introIndex)}
      className={`group relative flex flex-col ${introIndex === undefined ? '' : 'intro-fade'}`}
    >
      <div className="card-media relative aspect-[16/10] overflow-hidden rounded-card bg-surface-sky">
        <CmsImage
          media={post.coverImage}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
      </div>
      {post.publishedAt ? (
        <p className="mt-5 text-sm text-ink-muted">
          <time dateTime={post.publishedAt}>
            {t('publishedOn', { date: formatDate(locale, post.publishedAt) })}
          </time>
        </p>
      ) : null}
      <Heading
        className="mt-2 text-xl leading-snug font-semibold"
        lang={lang}
        dir={lang ? 'ltr' : undefined}
      >
        <Link
          href={{ pathname: '/news/[slug]', params: { slug: post.slug } }}
          className="text-ink no-underline after:absolute after:inset-0 group-hover:text-accent hover:text-accent"
        >
          <bdi>{post.title}</bdi>
        </Link>
      </Heading>
    </article>
  )
}
