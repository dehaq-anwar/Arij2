import { notFound, permanentRedirect, redirect } from 'next/navigation'

import { findRedirect, visitedPath } from '@/lib/cms/redirects'
import { resolveLocale } from '@/lib/locale-page'

type Props = { params: Promise<{ locale: string; rest: string[] }> }

/**
 * Any unknown path below a locale: a redirect set up in the CMS if there is one, otherwise that
 * locale's 404 page (with header, footer, lang, dir).
 */
export default async function CatchAll({ params }: Props) {
  const locale = await resolveLocale(params)
  const { rest } = await params
  const target = await findRedirect(visitedPath(locale, rest))
  if (target) (target.permanent ? permanentRedirect : redirect)(target.location)
  notFound()
}
