import { getTranslations } from 'next-intl/server'

import { Container } from '@/components/ui/Container'
import { OrgName } from '@/components/ui/OrgName'
import { Placeholder } from '@/components/ui/Placeholder'
import { Link } from '@/i18n/navigation'
import { legalNav, mainNav, membershipLink } from '@/lib/navigation'

import { Logo } from './Logo'

export async function SiteFooter() {
  const t = await getTranslations('Footer')
  const nav = await getTranslations('Navigation')
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <Container className="grid gap-10 py-12 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-ink-muted">{t('founded')}</p>
          <dl className="mt-4 space-y-1 text-sm text-ink-muted">
            <div>
              <dt className="inline font-semibold text-ink">{t('seatLabel')}: </dt>
              <dd className="inline">{t('seat')}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-ink">{t('registerLabel')}: </dt>
              <dd className="inline">{t('register')}</dd>
            </div>
          </dl>
        </div>

        <nav aria-label={nav('footerLabel')}>
          <h2 className="font-bold">{t('navHeading')}</h2>
          <ul className="mt-3 space-y-1">
            {[...mainNav, membershipLink].map(({ href, key }) => (
              <li key={href}>
                <Link href={href} className="inline-block py-1 text-ink hover:text-accent">
                  {nav(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-bold">{t('contactHeading')}</h2>
          <address className="mt-3 space-y-2 not-italic">
            <Placeholder inline>{t('address')}</Placeholder>
            <br />
            <Placeholder inline>{t('email')}</Placeholder>
          </address>
        </div>
      </Container>

      <div className="border-t border-line">
        <Container className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4 text-sm text-ink-muted">
          <p>
            © {year} <OrgName />
          </p>
          <nav aria-label={nav('legalLabel')}>
            <ul className="flex gap-6">
              {legalNav.map(({ href, key }) => (
                <li key={href}>
                  <Link href={href} className="inline-block py-1 text-ink hover:text-accent">
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
