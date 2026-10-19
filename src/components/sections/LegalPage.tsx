import { getTranslations } from 'next-intl/server'

import { Container } from '@/components/ui/Container'
import { PageHeader } from '@/components/ui/PageHeader'
import { Placeholder } from '@/components/ui/Placeholder'
import { hasRichText, RichText } from '@/components/ui/RichText'
import type { Locale } from '@/i18n/routing'
import { formatDate } from '@/lib/format'
import type { LegalNotice } from '@/payload-types'

type Props = {
  title: string
  content: LegalNotice['content']
  lastUpdated: string | null | undefined
  /** Shown while the CMS text is empty: legal texts are supplied by the association, never generated. */
  placeholder: string
  locale: Locale
}

export async function LegalPage({ title, content, lastUpdated, placeholder, locale }: Props) {
  const t = await getTranslations('Common')
  return (
    <>
      <PageHeader title={title} size="compact" />
      {/* Reading page: no scroll effects, just the text. */}
      <div className="bg-canvas py-14 sm:py-20">
        <Container>
          <div className="max-w-4xl rounded-card bg-surface p-7 sm:p-12">
            {hasRichText(content) ? (
              <RichText data={content} locale={locale} />
            ) : (
              <Placeholder>{placeholder}</Placeholder>
            )}
            {lastUpdated ? (
              <p className="mt-10 border-t border-line pt-6 text-sm text-ink-muted">
                <time dateTime={lastUpdated}>
                  {t('lastUpdated', { date: formatDate(locale, lastUpdated) })}
                </time>
              </p>
            ) : null}
          </div>
        </Container>
      </div>
    </>
  )
}
