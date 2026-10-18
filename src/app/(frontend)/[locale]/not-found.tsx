import { getTranslations } from 'next-intl/server'

import { ButtonLink } from '@/components/ui/ButtonLink'
import { Container } from '@/components/ui/Container'

export default async function NotFound() {
  const t = await getTranslations('NotFound')
  return (
    <Container className="py-16 sm:py-24">
      <p className="text-sm font-semibold text-ink-muted">404</p>
      <h1 className="mt-2 text-3xl font-bold text-brand-navy sm:text-4xl dark:text-ink">
        {t('title')}
      </h1>
      <p className="mt-4 max-w-prose text-lg text-ink-muted">{t('text')}</p>
      <ButtonLink href="/" className="mt-8">
        {t('backHome')}
      </ButtonLink>
    </Container>
  )
}
