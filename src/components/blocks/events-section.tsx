import { getTranslations } from 'next-intl/server'

import { EventCard } from '@/components/cards/EventCard'
import { Reveal } from '@/components/motion/Reveal'
import { Stagger } from '@/components/motion/Stagger'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Container } from '@/components/ui/Container'
import type { Localized } from '@/lib/cms/queries'
import type { Event } from '@/payload-types'

/** The next events; absent when nothing is coming up (no empty box on the page). */
export async function UpcomingEventsSection({
  events,
  heading,
  id,
}: {
  events: Localized<Event>[]
  heading?: string | null
  id: string
}) {
  if (!events.length) return null
  const t = await getTranslations('Events')
  return (
    <section aria-labelledby={id} className="bg-canvas py-24 sm:py-28">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Reveal variant="slide-start">
            <h2 id={id} className="text-heading">
              {heading || t('upcomingHeading')}
            </h2>
          </Reveal>
          <ButtonLink href="/events" variant="secondary" arrow>
            {t('allEvents')}
          </ButtonLink>
        </div>
        <Stagger className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {events.map(({ doc, translated }) => (
            <EventCard key={doc.id} event={doc} translated={translated} />
          ))}
        </Stagger>
      </Container>
    </section>
  )
}
