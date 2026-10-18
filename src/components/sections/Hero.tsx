import { getTranslations } from 'next-intl/server'

import { ButtonLink } from '@/components/ui/ButtonLink'
import { CmsText } from '@/components/ui/CmsText'
import { Container } from '@/components/ui/Container'

/**
 * Above the fold: rendered fully visible on the server (the headline is the LCP element).
 * React Bits slots (added once the repository is private): SplitText on the headline,
 * Waves as the decorative background.
 */
export async function Hero({ headline, subline }: { headline: string; subline?: string | null }) {
  const nav = await getTranslations('Navigation')
  return (
    <section className="relative overflow-hidden bg-surface">
      <Container className="relative py-16 sm:py-24">
        <h1 className="max-w-3xl text-4xl font-bold text-brand-navy sm:text-5xl dark:text-ink">
          <bdi>{headline}</bdi>
        </h1>
        <CmsText text={subline} className="mt-4 max-w-2xl text-lg text-ink-muted sm:text-xl" />
        <div className="mt-8 flex flex-wrap gap-4">
          <ButtonLink href="/membership">{nav('membership')}</ButtonLink>
          <ButtonLink href="/support" variant="secondary">
            {nav('support')}
          </ButtonLink>
        </div>
      </Container>
    </section>
  )
}
