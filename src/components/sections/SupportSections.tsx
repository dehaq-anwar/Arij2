import { getTranslations } from 'next-intl/server'

import { Stagger } from '@/components/motion/Stagger'
import { CmsImage } from '@/components/ui/CmsImage'
import { CmsText } from '@/components/ui/CmsText'
import { Container } from '@/components/ui/Container'
import { Placeholder } from '@/components/ui/Placeholder'
import type { Partner, SupportPage } from '@/payload-types'

/** "DE89 3704 …": IBANs are easier to read and copy in groups of four. */
const groupIban = (iban: string) =>
  iban
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/(.{4})(?=.)/g, '$1 ')

/**
 * Bank details exactly as entered in the CMS; a placeholder until the association adds them.
 * Account data is always left-to-right (also on the Arabic page) and never machine-translated.
 */
export async function BankDetails({ donate }: { donate: SupportPage['donate'] }) {
  const t = await getTranslations('Support')
  const rows = [
    { key: 'accountHolder', label: t('accountHolder'), value: donate?.accountHolder },
    { key: 'bank', label: t('bank'), value: donate?.bankName },
    { key: 'iban', label: 'IBAN', value: donate?.iban ? groupIban(donate.iban) : null },
    { key: 'bic', label: 'BIC', value: donate?.bic },
  ].filter((row) => row.value?.trim())

  return (
    <div className="glass mt-10 max-w-2xl rounded-card p-7 sm:p-9">
      <h3 className="text-xl font-semibold">{t('bankDetails')}</h3>
      {rows.length ? (
        <dl className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-[auto_1fr]">
          {rows.map((row) => (
            <div key={row.key} className="contents">
              <dt className="text-on-night-muted">{row.label}</dt>
              <dd className="font-medium tracking-wide" dir="ltr" translate="no">
                <bdi>{row.value}</bdi>
              </dd>
            </div>
          ))}
          {donate?.reference?.trim() ? (
            <div className="contents">
              <dt className="text-on-night-muted">{t('reference')}</dt>
              <dd className="font-medium">
                <CmsText as="span" text={donate.reference} />
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <div className="mt-5">
          <Placeholder>{t('bankPlaceholder')}</Placeholder>
        </div>
      )}
    </div>
  )
}

/** Partners that have agreed to be named (enforced by the collection's read access). */
export async function PartnerList({ partners }: { partners: Partner[] }) {
  if (!partners.length) return null
  const t = await getTranslations('Support')
  return (
    <section className="bg-canvas py-24 sm:py-28" aria-labelledby="partners-heading">
      <Container>
        <h2 id="partners-heading" className="text-heading">
          {t('partnersHeading')}
        </h2>
        <Stagger as="ul" className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {partners.map((partner) => (
            <li
              key={partner.id}
              data-stagger-item
              className="flex flex-col gap-4 rounded-card bg-surface p-7"
            >
              <CmsImage media={partner.logo} sizes="12rem" className="h-14 w-auto object-contain" />
              <h3 className="font-semibold">
                <bdi>{partner.url ? <a href={partner.url}>{partner.name}</a> : partner.name}</bdi>
              </h3>
              <CmsText text={partner.description} className="text-sm text-ink-muted" />
            </li>
          ))}
        </Stagger>
      </Container>
    </section>
  )
}
