import type { ReactNode } from 'react'

import { Container } from './Container'

/** Page title band. The h1 is the page's LCP candidate, so it is never animated in. */
export function PageHeader({
  title,
  children,
  lang,
}: {
  title: string
  children?: ReactNode
  lang?: string
}) {
  return (
    <div className="bg-surface">
      <Container className="py-12 sm:py-16">
        <h1
          lang={lang}
          className="max-w-4xl text-3xl font-bold text-brand-navy sm:text-4xl dark:text-ink"
        >
          <bdi>{title}</bdi>
        </h1>
        {children ? <div className="mt-4 max-w-3xl text-lg text-ink-muted">{children}</div> : null}
      </Container>
    </div>
  )
}
