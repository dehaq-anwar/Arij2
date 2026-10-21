import { getTranslations } from 'next-intl/server'
import type { CSSProperties, ReactNode } from 'react'

import { Atmosphere } from '@/components/ui/Atmosphere'
import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
import { SplitHeading } from '@/components/ui/SplitHeading'
import { Link } from '@/i18n/navigation'
import { isPlaceholder, placeholderLabel } from '@/lib/markers'
import type { Media } from '@/payload-types'

type Props = {
  image: Media | number | null | undefined
  title: string
  /** Language of the title/lead when the item is not translated (German fallback). */
  lang?: string
  /** The way back to the list (projects, news); pages of the page builder have none. */
  back?: { href: '/projects' | '/news' | '/events'; label: string }
  eyebrow?: ReactNode
  children?: ReactNode
}

/**
 * Opening of a project or post: its image across the full width, darkened towards the bottom,
 * with the title rising in over it. Without an image the night light takes its place.
 */
export async function MediaHero({ image, title, lang, back, eyebrow, children }: Props) {
  const t = await getTranslations('Common')
  const pending = isPlaceholder(title)
  const hasImage = Boolean(image && typeof image === 'object' && image.url)
  return (
    <section
      data-surface="night"
      className="relative isolate flex min-h-[78svh] flex-col overflow-hidden bg-night text-on-night"
    >
      {hasImage ? (
        <div className="absolute inset-0 -z-10">
          <CmsImage media={image} fill preload sizes="100vw" />
        </div>
      ) : (
        <Atmosphere variant="page" />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-t from-night via-night/45 to-night/30"
      />
      <Container className="pt-[calc(var(--header-h)+1.5rem)]">
        {back ? (
          <Link
            href={back.href}
            className="glass inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm text-on-night no-underline hover:text-on-night"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-4 rtl:-scale-x-100"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 12H5M11 6l-6 6 6 6" />
            </svg>
            {back.label}
          </Link>
        ) : null}
      </Container>
      <Container className="mt-auto pt-24 pb-14 sm:pb-20">
        {eyebrow || pending ? (
          <div
            className="intro-fade mb-5 flex flex-wrap items-center gap-3 text-sm text-on-night-muted"
            style={{ '--delay': '40ms' } as CSSProperties}
          >
            {pending ? (
              <span className="glass rounded-full px-3 py-1 text-xs text-on-night">
                {t('placeholder')}
              </span>
            ) : null}
            {eyebrow}
          </div>
        ) : null}
        <SplitHeading
          text={pending ? placeholderLabel(title) : title}
          lang={lang}
          className="text-title max-w-5xl"
        />
        {children ? (
          <div
            className="intro-fade text-lead mt-6 max-w-3xl text-on-night-muted"
            style={{ '--delay': '420ms' } as CSSProperties}
            lang={lang}
            dir={lang ? 'ltr' : undefined}
          >
            {children}
          </div>
        ) : null}
      </Container>
    </section>
  )
}
