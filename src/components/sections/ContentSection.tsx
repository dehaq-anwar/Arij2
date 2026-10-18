import type { ReactNode } from 'react'

import { hasRichText, RichText } from '@/components/ui/RichText'
import type { Locale } from '@/i18n/routing'

type Props = {
  id: string
  heading: string | null | undefined
  text?: Parameters<typeof RichText>[0]['data']
  locale: Locale
  children?: ReactNode
}

/**
 * A headed block of CMS rich text, left out entirely when it has neither text nor children.
 * Not animated: on text pages these blocks start right below the title, above the fold.
 */
export function ContentSection({ id, heading, text, locale, children }: Props) {
  if (!hasRichText(text) && !children) return null
  return (
    <section className="mt-14 first:mt-0" aria-labelledby={heading ? id : undefined}>
      {heading ? (
        <h2 id={id} className="text-2xl font-bold sm:text-3xl">
          {heading}
        </h2>
      ) : null}
      <RichText data={text} locale={locale} className="mt-4" />
      {children}
    </section>
  )
}
