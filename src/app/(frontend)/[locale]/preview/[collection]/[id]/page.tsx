import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createLocalReq } from 'payload'

import { can, type PermissionSubject } from '@/cms/access/permissions'
import { isVerifiedSession } from '@/cms/auth/session-state'
import { PREVIEW_COLLECTIONS, type PreviewCollection } from '@/cms/preview/live-preview'
import { EventArticle } from '@/components/articles/EventArticle'
import { NewsArticle } from '@/components/articles/NewsArticle'
import { ProjectArticle } from '@/components/articles/ProjectArticle'
import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { RefreshOnSave } from '@/components/preview/RefreshOnSave'
import { getPayloadClient } from '@/lib/cms/payload'
import { resolveLocale } from '@/lib/locale-page'
import type { Event, News, Page, Project } from '@/payload-types'

type Props = { params: Promise<{ locale: string; collection: string; id: string }> }

// Drafts of the signed-in editor: never cached, never indexed (headers in next.config.ts).
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * The live preview: the latest draft of a page, project or post, exactly as the website would
 * show it. Only for people signed in with both factors who may see content (content.read), and
 * only on the Control Center's host (src/lib/admin-host.ts).
 */
export default async function PreviewPage({ params }: Props) {
  const locale = await resolveLocale(params)
  const { collection, id } = await params
  if (!(PREVIEW_COLLECTIONS as readonly string[]).includes(collection)) notFound()
  const payload = await getPayloadClient()
  const requestHeaders = await headers()
  const { user } = await payload.auth({ headers: requestHeaders })
  if (!user) notFound()
  const req = await createLocalReq({ user, locale }, payload)
  if (!(await isVerifiedSession(req)) || !can(user as PermissionSubject, 'content.read')) {
    notFound()
  }
  const find = (fallback: boolean) =>
    payload
      .findByID({
        collection: collection as PreviewCollection,
        id: Number(id),
        draft: true,
        locale,
        fallbackLocale: fallback ? 'de' : false,
        depth: fallback ? 2 : 0,
        overrideAccess: false,
        req,
      })
      .catch(() => null)
  const doc = await find(true)
  if (!doc) notFound()
  const own = locale === 'de' ? doc : await find(false)
  const translated = Boolean((own as { title?: string | null } | null)?.title?.trim())
  const t = await getTranslations('Preview')
  const origin =
    payload.config.serverURL ||
    `${requestHeaders.get('x-forwarded-proto') ?? 'http'}://${requestHeaders.get('host')}`

  return (
    <>
      <RefreshOnSave serverURL={new URL(origin).origin} />
      <p
        role="status"
        className="fixed start-4 bottom-4 z-50 rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent shadow-lg"
      >
        {t('badge')}
      </p>
      {collection === 'pages' ? (
        <RenderBlocks page={doc as Page} locale={locale} />
      ) : collection === 'projects' ? (
        <ProjectArticle doc={doc as Project} translated={translated} locale={locale} />
      ) : collection === 'events' ? (
        <EventArticle doc={doc as Event} translated={translated} locale={locale} />
      ) : (
        <NewsArticle doc={doc as News} translated={translated} locale={locale} />
      )}
    </>
  )
}
