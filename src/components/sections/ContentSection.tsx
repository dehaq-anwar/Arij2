import type { ReactNode } from 'react'

import { Stagger } from '@/components/motion/Stagger'
import { hasRichText, RichText } from '@/components/ui/RichText'
import type { Locale } from '@/i18n/routing'

type Card = {
  id: string
  heading: string | null | undefined
  text?: Parameters<typeof RichText>[0]['data']
  icon?: ReactNode
  footer?: ReactNode
}

/**
 * Numbered cards for short CMS texts (membership steps, ways to support). Cards without text
 * and without a footer are left out, so the numbering stays continuous.
 */
export function CardSteps({
  cards,
  locale,
  numbered = true,
}: {
  cards: Card[]
  locale: Locale
  numbered?: boolean
}) {
  const shown = cards.filter((card) => hasRichText(card.text) || card.footer)
  if (!shown.length) return null
  return (
    <Stagger
      as="ol"
      className={`grid gap-4 lg:gap-5 ${shown.length >= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}
    >
      {shown.map((card, i) => (
        <li
          key={card.id}
          id={card.id}
          data-stagger-item
          data-spotlight
          className="relative isolate flex flex-col overflow-hidden rounded-card bg-surface p-7 shadow-[0_24px_50px_-36px_rgba(4,50,78,0.45)] sm:p-9"
        >
          <div className="relative flex items-center justify-between gap-4">
            {numbered ? (
              <span
                aria-hidden="true"
                className="text-4xl font-semibold tracking-tight text-accent"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
            ) : null}
            {card.icon ? (
              <span className="grid size-14 place-items-center rounded-full bg-surface-sky text-accent">
                {card.icon}
              </span>
            ) : null}
          </div>
          {card.heading ? (
            <h2 className="relative mt-8 text-2xl leading-tight font-semibold">{card.heading}</h2>
          ) : null}
          <RichText data={card.text} locale={locale} className="relative mt-4 text-ink-muted" />
          {card.footer ? <div className="relative mt-auto pt-8">{card.footer}</div> : null}
        </li>
      ))}
    </Stagger>
  )
}
