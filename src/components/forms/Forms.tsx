import { getTranslations } from 'next-intl/server'

import { MarkedText } from '@/components/ui/MarkedText'
import { getPathname, Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getFormTexts } from '@/lib/cms/queries'
import { issueFormToken } from '@/lib/forms/token'

import { ContactFormClient } from './ContactFormClient'
import { MembershipFormClient } from './MembershipFormClient'

/**
 * Server parts of the forms: the wording of declarations and consent comes from the CMS (with
 * its draft/placeholder marker), and every visit gets a freshly signed timestamp, which is why
 * pages with a form are rendered per request (`dynamic = 'force-dynamic'` on the page).
 * Not `connection()`: while Next.js renders a prefetch, it never resolves and the request hangs.
 */
async function shared(locale: Locale) {
  const f = await getTranslations({ locale, namespace: 'Forms' })
  const text = (value: string | null | undefined) => (
    <MarkedText as="span" text={value?.trim() ? value : f('missingText')} />
  )
  const privacyLink = (
    <Link href="/privacy" target="_blank" className="inline-flex items-center gap-1.5 font-medium">
      {f('privacyLink')}
      <span className="sr-only"> {f('newTab')}</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="size-4 rtl:-scale-x-100"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M8 4H4v12h12v-4M11 4h5v5M16 4l-7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  )
  return { text, privacyLink }
}

export async function MembershipForm({ locale, anchor }: { locale: Locale; anchor: string }) {
  const [{ text, privacyLink }, { membership }] = await Promise.all([
    shared(locale),
    getFormTexts(locale),
  ])
  return (
    <MembershipFormClient
      locale={locale}
      token={issueFormToken('membership')}
      permalink={`${getPathname({ href: '/membership', locale })}#${anchor}`}
      texts={{
        principles: text(membership.principles),
        fees: text(membership.fees),
        guardian: text(membership.guardian),
        consent: text(membership.consent),
        privacyLink,
      }}
    />
  )
}

export async function ContactForm({ locale, anchor }: { locale: Locale; anchor: string }) {
  const [{ text, privacyLink }, { contact }] = await Promise.all([
    shared(locale),
    getFormTexts(locale),
  ])
  return (
    <ContactFormClient
      locale={locale}
      token={issueFormToken('contact')}
      permalink={`${getPathname({ href: '/contact', locale })}#${anchor}`}
      texts={{ consent: text(contact.consent), privacyLink }}
    />
  )
}
