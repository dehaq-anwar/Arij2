import type { CSSProperties, ReactNode } from 'react'

import { Atmosphere } from './Atmosphere'
import { Container } from './Container'
import { SplitHeading } from './SplitHeading'

type Props = {
  title: string
  children?: ReactNode
  /** Language of the title when it differs from the page (untranslated items). */
  lang?: string
  eyebrow?: ReactNode
  /** "compact" for reading pages (legal texts), where the text matters more than the stage. */
  size?: 'page' | 'compact'
}

/**
 * Night opening of every inner page (direction C): drifting light, the title rising in letter
 * by letter (CSS, from the first paint), then an optional short lead. Room is left at the top
 * for the fixed header.
 */
export function PageHeader({ title, children, lang, eyebrow, size = 'page' }: Props) {
  return (
    <section
      data-surface="night"
      className={`relative isolate overflow-hidden bg-night text-on-night ${size === 'page' ? 'pt-[calc(var(--header-h)+4rem)] pb-20 sm:pt-[calc(var(--header-h)+6rem)] sm:pb-28' : 'pt-[calc(var(--header-h)+3rem)] pb-14 sm:pt-[calc(var(--header-h)+4.5rem)] sm:pb-20'}`}
    >
      <Atmosphere variant="page" />
      <Container>
        {eyebrow ? (
          <div
            className="intro-fade eyebrow mb-6 text-glow"
            style={{ '--delay': '60ms' } as CSSProperties}
          >
            {eyebrow}
          </div>
        ) : null}
        <SplitHeading
          text={title}
          lang={lang}
          className={`max-w-5xl ${size === 'page' ? 'text-title' : 'text-heading'}`}
        />
        {children ? (
          <div
            className="intro-fade text-lead mt-7 max-w-3xl text-on-night-muted"
            style={{ '--delay': '220ms' } as CSSProperties}
          >
            {children}
          </div>
        ) : null}
      </Container>
    </section>
  )
}
