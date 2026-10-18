import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { CmsText } from '@/components/ui/CmsText'
import { Container } from '@/components/ui/Container'
import { PageHeader } from '@/components/ui/PageHeader'
import { Placeholder } from '@/components/ui/Placeholder'
import { RichText } from '@/components/ui/RichText'
import { getGlobal } from '@/lib/cms/queries'
import { resolveLocale } from '@/lib/locale-page'
import { localizedAlternates } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({ locale, namespace: 'Navigation' })
  return { title: t('contact'), alternates: localizedAlternates('/contact', locale) }
}

export default async function ContactPage({ params }: Props) {
  const locale = await resolveLocale(params)
  const nav = await getTranslations('Navigation')
  const t = await getTranslations('Contact')
  const [page, settings] = await Promise.all([
    getGlobal('contact-page', locale),
    getGlobal('site-settings', locale),
  ])
  const { email, phone, address } = settings.contact ?? {}

  return (
    <>
      <PageHeader title={nav('contact')} />
      <Container className="grid gap-12 py-12 lg:grid-cols-2">
        <div>
          <RichText data={page.intro} locale={locale} className="text-lg" />
          <section className="mt-10 first:mt-0" aria-labelledby="details-heading">
            <h2 id="details-heading" className="text-2xl font-bold">
              {t('detailsHeading')}
            </h2>
            <dl className="mt-6 space-y-5">
              {page.showEmail && email ? (
                <div>
                  <dt className="text-sm text-ink-muted">{t('email')}</dt>
                  <dd className="text-lg font-semibold">
                    <a href={`mailto:${email}`} dir="ltr">
                      {email}
                    </a>
                  </dd>
                </div>
              ) : null}
              {page.showPhone && phone ? (
                <div>
                  <dt className="text-sm text-ink-muted">{t('phone')}</dt>
                  <dd className="text-lg font-semibold">
                    <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} dir="ltr">
                      {phone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {page.showAddress && address ? (
                <div>
                  <dt className="text-sm text-ink-muted">{t('address')}</dt>
                  <dd>
                    <address className="not-italic whitespace-pre-line">
                      <CmsText as="span" text={address} />
                    </address>
                  </dd>
                </div>
              ) : null}
              {page.officeHours ? (
                <div>
                  <dt className="text-sm text-ink-muted">{t('hours')}</dt>
                  <dd className="whitespace-pre-line">
                    <CmsText as="span" text={page.officeHours} />
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        </div>
        {/* The contact form (consent, honeypot, rate limit, server-side validation) follows in Phase 5. */}
        <section aria-labelledby="form-heading">
          <h2 id="form-heading" className="text-2xl font-bold">
            {t('formHeading')}
          </h2>
          <div className="mt-6">
            <Placeholder>{t('formPlaceholder')}</Placeholder>
          </div>
        </section>
      </Container>
    </>
  )
}
