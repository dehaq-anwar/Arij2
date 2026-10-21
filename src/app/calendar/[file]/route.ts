import { hasLocale } from 'next-intl'

import { getPathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { getEvent } from '@/lib/cms/queries'
import { eventCalendar } from '@/lib/ics'
import { siteUrl } from '@/lib/site'

/**
 * GET /calendar/<slug>.ics?lang=de — one event as a calendar file (RFC 5545), to save the date
 * in any calendar app. Generated here; nothing is sent to a calendar service.
 */
export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  const slug = decodeURIComponent(file).replace(/\.ics$/, '')
  const lang = new URL(request.url).searchParams.get('lang')
  const locale = hasLocale(routing.locales, lang) ? lang : routing.defaultLocale
  const result = await getEvent(slug, locale)
  if (!result) return new Response('Not Found', { status: 404 })
  const url =
    siteUrl() + getPathname({ locale, href: { pathname: '/events/[slug]', params: { slug } } })
  return new Response(eventCalendar(result.doc, url), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  })
}
