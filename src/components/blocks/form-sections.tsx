import { getTranslations } from 'next-intl/server'

import { ContactForm, MembershipForm } from '@/components/forms/Forms'
import { NightBand } from '@/components/sections/NightBand'
import { CmsText } from '@/components/ui/CmsText'
import { Container } from '@/components/ui/Container'
import { RichText } from '@/components/ui/RichText'
import type { Locale } from '@/i18n/routing'
import type { ContactFormBlock, MembershipFormBlock, SiteSetting } from '@/payload-types'

/**
 * The two forms as blocks of their system pages. Their anchors stay "apply" and "write", so that
 * existing links (and the forms' own return addresses) keep working.
 */

export async function MembershipFormSection({
  block,
  locale,
}: {
  block: MembershipFormBlock
  locale: Locale
}) {
  const t = await getTranslations('Membership')
  return (
    <NightBand id="apply" heading={block.heading || t('applyHeading')}>
      <div className="mt-8 max-w-3xl">
        <CmsText text={block.note} />
      </div>
      <div
        data-surface="day"
        className="mt-12 max-w-4xl rounded-card bg-surface p-6 text-ink shadow-[0_40px_120px_-40px_rgba(127,224,214,0.45)] sm:p-10 lg:p-14"
      >
        <MembershipForm locale={locale} anchor="apply" />
      </div>
    </NightBand>
  )
}

export async function ContactFormSection({
  block,
  settings,
  locale,
}: {
  block: ContactFormBlock
  settings: SiteSetting
  locale: Locale
}) {
  const t = await getTranslations('Contact')
  const { email, phone, address } = settings.contact ?? {}
  return (
    <div className="bg-canvas py-20 sm:py-28">
      <Container className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10">
        <div>
          <RichText data={block.intro} locale={locale} className="text-lead text-ink" />
          <section className="mt-12 first:mt-0" aria-labelledby="details-heading">
            <h2 id="details-heading" className="eyebrow text-ink-muted">
              {t('detailsHeading')}
            </h2>
            {block.showEmail && email ? (
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
              {block.showPhone && phone ? (
                <div>
                  <dt className="text-sm text-ink-muted">{t('phone')}</dt>
                  <dd className="mt-1 text-lg font-medium">
                    <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} dir="ltr">
                      {phone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {block.showAddress && address ? (
                <div>
                  <dt className="text-sm text-ink-muted">{t('address')}</dt>
                  <dd className="mt-1">
                    <address className="not-italic whitespace-pre-line">
                      <CmsText as="span" text={address} />
                    </address>
                  </dd>
                </div>
              ) : null}
              {block.officeHours ? (
                <div>
                  <dt className="text-sm text-ink-muted">{t('hours')}</dt>
                  <dd className="mt-1 whitespace-pre-line">
                    <CmsText as="span" text={block.officeHours} />
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        </div>
        <section
          id="write"
          aria-labelledby="form-heading"
          data-surface="day"
          className="self-start rounded-card bg-surface p-6 shadow-[0_30px_90px_-40px_rgba(4,50,78,0.35)] sm:p-10"
        >
          <h2 id="form-heading" className="text-2xl font-semibold">
            {t('formHeading')}
          </h2>
          <div className="mt-6">
            <ContactForm locale={locale} anchor="write" />
          </div>
        </section>
      </Container>
    </div>
  )
}
