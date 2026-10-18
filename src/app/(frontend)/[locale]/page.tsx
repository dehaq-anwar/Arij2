import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { OrgName } from '@/components/ui/OrgName'
import { getDirection, getIntlLocale, localeNames } from '@/i18n/locale'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

// Temporary Phase 2 page: shows routing, direction, fonts and colour tokens for review.
// It is replaced by the real home page in Phase 4.

const swatches = [
  { token: 'canvas', className: 'bg-canvas' },
  { token: 'surface', className: 'bg-surface' },
  { token: 'surface-sky', className: 'bg-surface-sky' },
  { token: 'ink', className: 'bg-ink' },
  { token: 'ink-muted', className: 'bg-ink-muted' },
  { token: 'accent', className: 'bg-accent' },
  { token: 'accent-hover', className: 'bg-accent-hover' },
  { token: 'brand', className: 'bg-brand' },
  { token: 'brand-navy', className: 'bg-brand-navy' },
  { token: 'sky', className: 'bg-sky' },
  { token: 'sky-light', className: 'bg-sky-light' },
  { token: 'line-strong', className: 'bg-line-strong' },
  { token: 'danger', className: 'bg-danger' },
  { token: 'success', className: 'bg-success' },
] as const

type Props = { params: Promise<{ locale: string }> }

export default async function SetupPreviewPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('SetupPreview')
  const sampleNumber = new Intl.NumberFormat(getIntlLocale(locale)).format(1234567.89)
  const otherLocales = routing.locales.filter((l) => l !== locale)

  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <p className="mb-8 rounded-md border border-line-strong bg-surface-sky px-4 py-3 text-ink">
        {t('notice')}
      </p>

      <h1 className="text-4xl font-bold text-brand-navy dark:text-ink">
        <OrgName />
      </h1>

      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-ink-muted">
        <dt>{t('localeLabel')}</dt>
        <dd>
          <code>{locale}</code>
        </dd>
        <dt>{t('directionLabel')}</dt>
        <dd>
          <code>{getDirection(locale)}</code>
        </dd>
        <dt>{t('numberSample')}</dt>
        <dd>{sampleNumber}</dd>
      </dl>

      <nav aria-label={t('otherLanguages')} className="mt-6">
        <h2 className="text-sm font-semibold text-ink-muted">{t('otherLanguages')}</h2>
        <ul className="mt-2 flex gap-4">
          {otherLocales.map((l) => (
            <li key={l}>
              <Link href="/" locale={l} hrefLang={l} lang={l} className="underline">
                {localeNames[l]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="mt-12" aria-labelledby="tokens-heading">
        <h2 id="tokens-heading" className="text-2xl font-bold">
          {t('tokensHeading')}
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {swatches.map((s) => (
            <li key={s.token} className="text-sm">
              <span
                aria-hidden="true"
                className={`block h-16 rounded-md border border-line-strong ${s.className}`}
              />
              <code className="mt-1 block text-ink-muted" dir="ltr">
                {s.token}
              </code>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="type-heading">
        <h2 id="type-heading" className="text-2xl font-bold">
          {t('typeHeading')}
        </h2>
        <p className="mt-4 text-lg">{t('typeSample')}</p>
        <p className="mt-2 text-lg font-bold">{t('typeSample')}</p>
        <p className="mt-6 flex flex-wrap items-center gap-6">
          <button
            type="button"
            className="rounded-md bg-accent px-5 py-3 font-semibold text-on-accent hover:bg-accent-hover"
          >
            {t('buttonSample')}
          </button>
          <a href="#main" className="underline">
            {t('linkSample')}
          </a>
        </p>
      </section>
    </main>
  )
}
