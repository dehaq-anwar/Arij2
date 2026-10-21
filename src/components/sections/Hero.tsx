import { getTranslations } from 'next-intl/server'
import type { CSSProperties } from 'react'

import { BlockButton, type LinkValue } from '@/components/blocks/BlockButton'
import { Magnetic } from '@/components/motion/Magnetic'
import { Atmosphere } from '@/components/ui/Atmosphere'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Container } from '@/components/ui/Container'
import { SplitHeading } from '@/components/ui/SplitHeading'

/**
 * Home opening: night with drifting light and wing lines, the name rising in letter by letter,
 * the tagline, two ways in. Everything is server-rendered and visible from the first paint
 * (the animations are CSS); the headline is the page's LCP element.
 */
export async function Hero({
  headline,
  tagline,
  buttons,
}: {
  headline: string
  tagline?: string | null
  /** The page builder's buttons (at most two); without them, membership and support. */
  buttons?: LinkValue[] | null
}) {
  const nav = await getTranslations('Navigation')
  return (
    <section
      data-surface="night"
      className="relative isolate flex min-h-svh flex-col overflow-hidden bg-night text-on-night"
    >
      <Atmosphere variant="hero" wings />
      <Container className="flex flex-1 flex-col items-center justify-center pt-[calc(var(--header-h)+2rem)] pb-28 text-center">
        <SplitHeading text={headline} className="text-display max-w-6xl" />
        {tagline ? (
          <p
            className="intro-fade text-lead mt-8 text-glow-strong sm:mt-10"
            style={{ '--delay': '650ms' } as CSSProperties}
          >
            {tagline}
          </p>
        ) : null}
        <div
          className="intro-fade mt-10 flex flex-wrap items-center justify-center gap-3"
          style={{ '--delay': '800ms' } as CSSProperties}
        >
          {buttons ? (
            buttons.slice(0, 2).map((button, i) =>
              i === 0 ? (
                <Magnetic key={i}>
                  <BlockButton link={button} variant="light" arrow />
                </Magnetic>
              ) : (
                <BlockButton key={i} link={button} variant="glass" />
              ),
            )
          ) : (
            <>
              <Magnetic>
                <ButtonLink href="/membership" variant="light" arrow>
                  {nav('membership')}
                </ButtonLink>
              </Magnetic>
              <ButtonLink href="/support" variant="glass">
                {nav('support')}
              </ButtonLink>
            </>
          )}
        </div>
      </Container>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-8 flex justify-center">
        <span className="scroll-cue" />
      </div>
    </section>
  )
}
