import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { Atmosphere } from '@/components/ui/Atmosphere'
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
      <div className="bg-canvas py-20 sm:py-28">
        <Container className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10">
          <div>
            <RichText data={page.intro} locale={locale} className="text-lead text-ink" />
            <section className="mt-12 first:mt-0" aria-labelledby="details-heading">
              <h2 id="details-heading" className="eyebrow text-ink-muted">
                {t('detailsHeading')}
              </h2>
              {page.showEmail && email ? (
                <p className="mt-6">
                  <span className="sr-only">{t('email')}: </span>
                  <a
                    href={`mailto:${email}`}
                    dir="ltr"
                    className="text-[clamp(1.75rem,4vw,3rem)] leading-tight font-semibold tracking-tight text-ink no-underline decoration-brand decoration-2 underline-offset-8 hover:text-accent hover:underline"
                  >
                    {email}
                  </a>
                </p>
              ) : null}
              <dl className="mt-10 grid gap-6 sm:grid-cols-2">
                {page.showPhone && phone ? (
                  <div>
                    <dt className="text-sm text-ink-muted">{t('phone')}</dt>
                    <dd className="mt-1 text-lg font-medium">
                      <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} dir="ltr">
                        {phone}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {page.showAddress && address ? (
                  <div>
                    <dt className="text-sm text-ink-muted">{t('address')}</dt>
                    <dd className="mt-1">
                      <address className="not-italic whitespace-pre-line">
                        <CmsText as="span" text={address} />
                      </address>
                    </dd>
                  </div>
                ) : null}
                {page.officeHours ? (
                  <div>
                    <dt className="text-sm text-ink-muted">{t('hours')}</dt>
                    <dd className="mt-1 whitespace-pre-line">
                      <CmsText as="span" text={page.officeHours} />
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>
          </div>
          {/* The contact form (consent, honeypot, rate limit, server-side validation) follows in Phase 5. */}
          <section
            aria-labelledby="form-heading"
            className="relative isolate self-start overflow-hidden rounded-card bg-night p-8 text-on-night sm:p-10"
          >
            <Atmosphere variant="band" />
            <h2 id="form-heading" className="text-2xl font-semibold">
              {t('formHeading')}
            </h2>
            <div className="mt-6">
              <Placeholder>{t('formPlaceholder')}</Placeholder>
            </div>
          </section>
        </Container>
      </div>
    </>
  )
}
