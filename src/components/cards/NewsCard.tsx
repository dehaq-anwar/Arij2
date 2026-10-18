import { getLocale, getTranslations } from 'next-intl/server'

import { CmsImage } from '@/components/ui/CmsImage'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { formatDate } from '@/lib/format'
import type { News } from '@/payload-types'

export async function NewsCard({ post, translated }: { post: News; translated: boolean }) {
  const t = await getTranslations('Common')
  const locale = (await getLocale()) as Locale
  const lang = translated ? undefined : 'de'
  return (
    <article
      data-stagger-item
      className="group relative flex flex-col overflow-hidden rounded-lg border border-line-strong bg-canvas transition-colors hover:border-accent"
    >
      <CmsImage
        media={post.coverImage}
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="aspect-[3/2] w-full object-cover"
      />
      <div className="flex flex-1 flex-col p-6">
        {post.publishedAt ? (
          <p className="text-sm text-ink-muted">
            <time dateTime={post.publishedAt}>
              {t('publishedOn', { date: formatDate(locale, post.publishedAt) })}
            </time>
          </p>
        ) : null}
        <div lang={lang} dir={lang ? 'ltr' : undefined}>
          <h3 className="mt-2 text-lg font-bold">
            <Link
              href={{ pathname: '/news/[slug]', params: { slug: post.slug } }}
              className="text-ink no-underline after:absolute after:inset-0 hover:text-accent"
            >
              <bdi>{post.title}</bdi>
            </Link>
          </h3>
          <p className="mt-3 text-ink-muted">{post.excerpt}</p>
        </div>
      </div>
    </article>
  )
}
