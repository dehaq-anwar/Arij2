import { getLocale, getTranslations } from 'next-intl/server'

import { Atmosphere } from '@/components/ui/Atmosphere'
import { CmsText } from '@/components/ui/CmsText'
import { Container } from '@/components/ui/Container'
import { OrgName } from '@/components/ui/OrgName'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getGlobal } from '@/lib/cms/queries'
import { legalNav, mainNav, membershipLink, prefetchFor } from '@/lib/navigation'
import type { SiteSetting } from '@/payload-types'

import { Logo } from './Logo'

type Platform = NonNullable<SiteSetting['socialLinks']>[number]['platform']

const platformNames: Record<Platform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  x: 'X',
  tiktok: 'TikTok',
  mastodon: 'Mastodon',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
}

export async function SiteFooter() {
  const t = await getTranslations('Footer')
  const nav = await getTranslations('Navigation')
  const settings = await getGlobal('site-settings', (await getLocale()) as Locale)
  const { email, address } = settings.contact ?? {}
  const social = settings.socialLinks ?? []
  const year = new Date().getFullYear()

  return (
    <footer
      data-surface="night"
      className="relative isolate mt-auto overflow-hidden bg-night text-on-night"
    >
      <Atmosphere variant="band" />
      <Container className="pt-20 pb-16 sm:pt-28 sm:pb-20">
        {settings.tagline ? (
          <p className="text-title max-w-4xl text-glow-strong">{settings.tagline}</p>
        ) : null}
      </Container>

      <Container>
        <div className="grid gap-12 border-t border-on-night/15 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo tone="night" className="text-on-night hover:text-on-night" />
            <p className="mt-5 max-w-xs text-on-night-muted">{t('founded')}</p>
            <dl className="mt-5 space-y-1 text-sm text-on-night-muted">
              <div>
                <dt className="inline font-medium text-on-night">{t('seatLabel')}: </dt>
                <dd className="inline">{t('seat')}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-on-night">{t('registerLabel')}: </dt>
                <dd className="inline">{t('register')}</dd>
              </div>
            </dl>
          </div>

          <nav aria-label={nav('footerLabel')}>
            <h2 className="eyebrow text-on-night-muted">{t('navHeading')}</h2>
            <ul className="mt-4 space-y-1">
              {[...mainNav, membershipLink].map(({ href, key }) => (
                <li key={href}>
                  <Link
                    href={href}
                    prefetch={prefetchFor(href)}
                    className="inline-block py-1 text-on-night no-underline hover:text-glow"
                  >
                    {nav(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="eyebrow text-on-night-muted">{t('contactHeading')}</h2>
            <address className="mt-4 space-y-3 not-italic">
              {address ? (
                <div className="whitespace-pre-line">
                  <CmsText as="span" text={address} />
                </div>
              ) : null}
              {email ? (
                <p>
                  <a
                    href={`mailto:${email}`}
                    dir="ltr"
                    className="text-glow hover:text-glow-strong"
                  >
                    {email}
                  </a>
                </p>
              ) : null}
            </address>
            {social.length ? (
              // Plain links only: no embedded widgets, so no third-party requests or cookies.
              <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1">
                {social.map((link) => (
                  <li key={link.id ?? link.url}>
                    <a
                      href={link.url}
                      className="inline-block py-1 text-on-night hover:text-glow"
                      translate="no"
                    >
                      {platformNames[link.platform]}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </Container>

      <div className="border-t border-on-night/15">
        <Container className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-5 text-sm text-on-night-muted">
          <p>
            © {year} <OrgName />
          </p>
          <nav aria-label={nav('legalLabel')}>
            <ul className="flex gap-6">
              {legalNav.map(({ href, key }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-block py-1 text-on-night no-underline hover:text-glow"
                  >
                    {nav(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </div>
    </footer>
  )
}
