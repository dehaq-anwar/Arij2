import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { EventCard } from '@/components/cards/EventCard'
import { Stagger } from '@/components/motion/Stagger'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { getPastEvents, getUpcomingEvents } from '@/lib/cms/queries'
import { resolveLocale } from '@/lib/locale-page'
import { localizedAlternates } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({ locale, namespace: 'Navigation' })
  return { title: t('events'), alternates: localizedAlternates('/events', locale) }
}

/** Upcoming events first (soonest first), then the past ones of the last two years. */
export default async function EventsPage({ params }: Props) {
  const locale = await resolveLocale(params)
  const nav = await getTranslations('Navigation')
  const t = await getTranslations('Events')
  const [upcoming, past] = await Promise.all([getUpcomingEvents(locale), getPastEvents(locale)])

  return (
    <>
      <PageHeader title={nav('events')} />
      <div className="bg-canvas py-16 sm:py-24">
        <Container>
          <section aria-labelledby="upcoming-heading">
            <h2 id="upcoming-heading" className="text-heading">
              {t('upcoming')}
            </h2>
            {upcoming.length ? (
              <Stagger className="mt-10 grid gap-5 lg:grid-cols-2">
                {upcoming.map(({ doc, translated }) => (
                  <EventCard key={doc.id} event={doc} translated={translated} />
                ))}
              </Stagger>
            ) : (
              <div className="mt-8">
                <EmptyState>{t('empty')}</EmptyState>
              </div>
            )}
          </section>
          {past.length ? (
            <section aria-labelledby="past-heading" className="mt-20">
              <h2 id="past-heading" className="text-heading">
                {t('past')}
              </h2>
              <Stagger className="mt-10 grid gap-5 lg:grid-cols-2">
                {past.map(({ doc, translated }) => (
                  <EventCard key={doc.id} event={doc} translated={translated} />
                ))}
              </Stagger>
            </section>
          ) : null}
        </Container>
      </div>
    </>
  )
}
