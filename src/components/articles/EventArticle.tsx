import { getTranslations } from 'next-intl/server'

import { MediaHero } from '@/components/sections/MediaHero'
import { buttonClass } from '@/components/ui/ButtonLink'
import { CmsText } from '@/components/ui/CmsText'
import { Container } from '@/components/ui/Container'
import { RichText } from '@/components/ui/RichText'
import { TranslationNotice } from '@/components/ui/TranslationNotice'
import type { Locale } from '@/i18n/routing'
import { formatEventTime } from '@/lib/format'
import { isSafeUrl } from '@/lib/safe-url'
import type { Event } from '@/payload-types'

/** An event: image, title, summary; then when and where, the text, registration and calendar. */
export async function EventArticle({
  doc,
  translated,
  locale,
}: {
  doc: Event
  translated: boolean
  locale: Locale
}) {
  const t = await getTranslations('Events')
  const lang = translated ? undefined : 'de'
  const dir = translated ? undefined : 'ltr'
  const registration = isSafeUrl(doc.registrationUrl, { relative: false })
    ? doc.registrationUrl
    : null

  return (
    <article>
      <MediaHero
        image={doc.coverImage}
        title={doc.title}
        lang={lang}
        back={{ href: '/events', label: t('backToEvents') }}
        eyebrow={
          <time dateTime={doc.startsAt}>{formatEventTime(locale, doc.startsAt, doc.endsAt)}</time>
        }
      >
        <CmsText text={doc.excerpt} as="span" />
      </MediaHero>
      <div className="bg-canvas py-16 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-20">
          <div>
            {!translated ? (
              <div className="mb-10">
                <TranslationNotice />
              </div>
            ) : null}
            <div lang={lang} dir={dir}>
              <RichText data={doc.body} locale={locale} className="text-lg" />
            </div>
          </div>
          <aside className="self-start rounded-card bg-surface p-7 shadow-[0_24px_50px_-36px_rgba(4,50,78,0.45)] lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
            <dl className="space-y-5">
              <div>
                <dt className="text-sm text-ink-muted">{t('when')}</dt>
                <dd className="mt-0.5 font-medium">
                  <time dateTime={doc.startsAt}>
                    {formatEventTime(locale, doc.startsAt, doc.endsAt)}
                  </time>
                </dd>
              </div>
              {doc.location ? (
                <div>
                  <dt className="text-sm text-ink-muted">{t('where')}</dt>
                  <dd className="mt-0.5 font-medium">
                    <bdi>{doc.location}</bdi>
                  </dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-7 flex flex-col gap-3">
              {registration ? (
                <a
                  href={registration}
                  rel="noopener noreferrer"
                  className={buttonClass('primary', 'w-full')}
                >
                  {t('register')}
                </a>
              ) : null}
              <a
                href={`/calendar/${encodeURIComponent(doc.slug)}.ics?lang=${locale}`}
                download
                className={buttonClass('secondary', 'w-full')}
                aria-describedby={`calendar-hint-${doc.id}`}
              >
                {t('calendar')}
              </a>
              <p id={`calendar-hint-${doc.id}`} className="text-sm text-ink-muted">
                {t('calendarHint')}
              </p>
            </div>
          </aside>
        </Container>
      </div>
    </article>
  )
}
