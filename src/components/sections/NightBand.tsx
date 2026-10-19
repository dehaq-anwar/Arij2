import type { ReactNode } from 'react'

import { Atmosphere } from '@/components/ui/Atmosphere'
import { Container } from '@/components/ui/Container'

/** A full-width night band for the closing call of a page (apply, donate, write to us). */
export function NightBand({
  id,
  heading,
  children,
}: {
  id: string
  heading: string | null | undefined
  children?: ReactNode
}) {
  return (
    <section
      id={id}
      data-surface="night"
      aria-labelledby={heading ? `${id}-heading` : undefined}
      className="relative isolate overflow-hidden bg-night text-on-night"
    >
      <Atmosphere variant="band" />
      <Container className="py-24 sm:py-32">
        {heading ? (
          <h2 id={`${id}-heading`} className="text-title max-w-4xl">
            {heading}
          </h2>
        ) : null}
        {children}
      </Container>
    </section>
  )
}
