import { getLocale, getTranslations } from 'next-intl/server'

import { getIntlLocale } from '@/i18n/locale'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { formatEventTime } from '@/lib/format'
import type { Event } from '@/payload-types'

/** Day and short month of the start, in Berlin time, for the date tile. */
function dateTile(locale: Locale, value: string) {
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(getIntlLocale(locale), {
      ...options,
      timeZone: 'Europe/Berlin',
    }).format(new Date(value))
  return { day: format({ day: 'numeric' }), month: format({ month: 'short' }) }
}

/** An event as date tile, title, time and place (the text is on the event's own page). */
export async function EventCard({ event, translated }: { event: Event; translated: boolean }) {
  const t = await getTranslations('Events')
  const locale = (await getLocale()) as Locale
  const lang = translated ? undefined : 'de'
  const tile = dateTile(locale, event.startsAt)
  return (
    <article
      data-stagger-item
      className="group relative flex gap-5 rounded-card bg-surface p-6 shadow-[0_24px_50px_-36px_rgba(4,50,78,0.45)] sm:p-7"
    >
      <p
        aria-hidden="true"
        className="grid size-20 shrink-0 place-content-center rounded-[1.25rem] bg-surface-sky text-center text-accent"
      >
        <span className="text-3xl leading-none font-semibold">{tile.day}</span>
        <span className="mt-1 text-sm font-medium">{tile.month}</span>
      </p>
      <div className="min-w-0">
        <h3
          className="text-xl leading-snug font-semibold"
          lang={lang}
          dir={lang ? 'ltr' : undefined}
        >
          <Link
            href={{ pathname: '/events/[slug]', params: { slug: event.slug } }}
            className="text-ink no-underline after:absolute after:inset-0 group-hover:text-accent hover:text-accent"
          >
            <bdi>{event.title}</bdi>
          </Link>
        </h3>
        <dl className="mt-3 space-y-1 text-ink-muted">
          <div>
            <dt className="sr-only">{t('when')}</dt>
            <dd>
              <time dateTime={event.startsAt}>
                {formatEventTime(locale, event.startsAt, event.endsAt)}
              </time>
            </dd>
          </div>
          {event.location ? (
            <div>
              <dt className="sr-only">{t('where')}</dt>
              <dd>
                <bdi>{event.location}</bdi>
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </article>
  )
}
