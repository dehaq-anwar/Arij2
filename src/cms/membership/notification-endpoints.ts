import type { Endpoint, PayloadRequest } from 'payload'

import { isVerifiedSession } from '../auth/session-state'

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

async function signedIn(req: PayloadRequest) {
  if (!req.user || !(await isVerifiedSession(req))) return null
  return Number(req.user.id)
}

/**
 * GET  /api/notifications/feed?limit=10  the signed-in person's latest notifications and the
 *                                        number of unread ones
 * POST /api/notifications/read           { ids: number[] } or { all: true }: mark as read
 */
export const notificationEndpoints: Endpoint[] = [
  {
    path: '/feed',
    method: 'get',
    handler: async (req) => {
      const userId = await signedIn(req)
      if (userId == null) return json({ error: 'not_signed_in' }, 401)
      const limit = Math.min(Math.max(Number(req.searchParams.get('limit')) || 10, 1), 50)
      const own = { recipient: { equals: userId } }
      const [latest, unread] = await Promise.all([
        req.payload.find({
          collection: 'notifications',
          where: own,
          sort: '-createdAt',
          limit,
          depth: 0,
          overrideAccess: true,
          req,
        }),
        req.payload.count({
          collection: 'notifications',
          where: { and: [own, { readAt: { exists: false } }] },
          overrideAccess: true,
          req,
        }),
      ])
      return json({
        unread: unread.totalDocs,
        items: latest.docs.map((doc) => ({
          id: doc.id,
          kind: doc.kind,
          subjectType: doc.subjectType,
          subjectId: doc.subjectId ?? null,
          href: doc.href,
          createdAt: doc.createdAt,
          read: Boolean(doc.readAt),
        })),
      })
    },
  },
  {
    path: '/read',
    method: 'post',
    handler: async (req) => {
      const userId = await signedIn(req)
      if (userId == null) return json({ error: 'not_signed_in' }, 401)
      const body = (await req.json?.().catch(() => ({}))) as { ids?: unknown; all?: unknown }
      const ids = Array.isArray(body.ids)
        ? body.ids
            .map(Number)
            .filter((id) => Number.isInteger(id))
            .slice(0, 200)
        : []
      if (!body.all && !ids.length) return json({ error: 'nothing_to_mark' }, 400)
      const result = await req.payload.update({
        collection: 'notifications',
        where: {
          and: [
            { recipient: { equals: userId } },
            { readAt: { exists: false } },
            ...(body.all ? [] : [{ id: { in: ids } }]),
          ],
        },
        data: { readAt: new Date().toISOString() },
        overrideAccess: true,
        depth: 0,
        req,
      })
      return json({ marked: result.docs.length })
    },
  },
]
