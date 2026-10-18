import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { ReactNode } from 'react'

import { fontVariables } from '@/fonts'
import { getDirection } from '@/i18n/locale'
import { routing } from '@/i18n/routing'
import '@/styles/globals.css'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: 'Metadata' })
  const serverURL = process.env.NEXT_PUBLIC_SERVER_URL

  return {
    metadataBase: serverURL ? new URL(serverURL) : undefined,
    title: { default: t('siteName'), template: `%s – ${t('siteName')}` },
    description: t('description'),
    // Placeholder content must not be indexed: indexing is opt-in at launch.
    robots:
      process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true'
        ? undefined
        : { index: false, follow: false },
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  return (
    <html lang={locale} dir={getDirection(locale)} className={fontVariables}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
