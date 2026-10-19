import type { Metadata } from 'next'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SkipLink } from '@/components/layout/SkipLink'
import { SmoothScroll } from '@/components/motion/SmoothScroll'
import { Spotlight } from '@/components/motion/Spotlight'
import { fontVariables } from '@/fonts'
import { getDirection } from '@/i18n/locale'
import { routing } from '@/i18n/routing'
import { getGlobal } from '@/lib/cms/queries'
import { indexingAllowed, siteUrl } from '@/lib/site'
import '@/styles/globals.css'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

/**
 * Runs before first paint: marks that JavaScript is available, so scroll-reveal content may start
 * hidden. If the motion code has not started within 4 s (slow or failed scripts), the mark is
 * removed again and everything is shown.
 */
const motionBootstrap = `(function(e){e.classList.add('js');setTimeout(function(){if(!e.hasAttribute('data-motion-ready'))e.classList.remove('js')},4000)})(document.documentElement)`

// Pages read from the CMS, so nothing is prerendered at build time (builds need no database).
// Each page is rendered on its first visit, then served from cache until the CMS changes.
export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: 'Metadata' })
  const settings = await getGlobal('site-settings', locale)

  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t('siteName'), template: `%s – ${t('siteName')}` },
    description: settings.description || t('description'),
    // Placeholder content must not be indexed: indexing is opt-in at launch.
    robots: indexingAllowed() ? undefined : { index: false, follow: false },
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  return (
    // The bootstrap script adds a class before hydration, hence suppressHydrationWarning.
    <html
      lang={locale}
      dir={getDirection(locale)}
      className={fontVariables}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionBootstrap }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <SmoothScroll>
            <SkipLink />
            <SiteHeader />
            <main id="main" tabIndex={-1} className="flex-1 outline-none">
              {children}
            </main>
            <SiteFooter />
            <Spotlight />
          </SmoothScroll>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
