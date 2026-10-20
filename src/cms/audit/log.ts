import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
  Payload,
  PayloadRequest,
} from 'payload'

import type { AuditArea } from '../access/permissions'

export type AuditActor = { id: number | string; name?: string | null; role?: string | null }

export type AuditEntry = {
  action: string
  area: AuditArea
  result?: 'ok' | 'denied' | 'failed'
  /** Who did it; `undefined` takes the signed-in person of `req`, `null` means the system. */
  actor?: AuditActor | null
  target?: { type: string; id?: number | string | null; label?: string | null }
  stepUp?: boolean
  /** Small, never personal content: field names, status values, counts. */
  detail?: Record<string, unknown>
}

/** Context flag for writes that must not themselves be audited (or that log separately). */
export const SKIP_AUDIT = 'skipAudit'

export const actorOf = (req?: PayloadRequest | null): AuditActor | null => {
  const user = req?.user as { id: number | string; name?: string; role?: string } | null
  return user ? { id: user.id, name: user.name ?? null, role: user.role ?? null } : null
}

/**
 * Writes one entry. With `req` the entry belongs to the request's transaction (it disappears if
 * the change itself is rolled back); without it, it is written on its own, which is what
 * failures and refusals need. Logging never breaks the action being logged.
 */
export async function audit(payload: Payload, entry: AuditEntry, req?: PayloadRequest) {
  const actor = entry.actor === undefined ? actorOf(req) : entry.actor
  try {
    await payload.create({
      collection: 'audit-log',
      data: {
        action: entry.action,
        area: entry.area,
        result: entry.result ?? 'ok',
        actorId: actor ? Number(actor.id) : null,
        actorName: actor?.name ?? null,
        actorRole: actor?.role ?? null,
        targetType: entry.target?.type ?? null,
        targetId: entry.target?.id != null ? String(entry.target.id) : null,
        targetLabel: entry.target?.label ?? null,
        stepUp: entry.stepUp ?? false,
        detail: entry.detail ?? null,
      },
      overrideAccess: true,
      depth: 0,
      context: { [SKIP_AUDIT]: true },
      ...(req ? { req } : {}),
    })
  } catch (error) {
    payload.logger.error({ err: error, action: entry.action }, 'Could not write audit entry')
  }
}

const IGNORED_FIELDS = new Set(['updatedAt', 'createdAt', 'id', 'sessions'])

/** Names of the top-level fields that differ, and the old/new value of status fields only. */
export function describeChange(
  doc: Record<string, unknown>,
  previous: Record<string, unknown> | undefined,
) {
  if (!previous) return undefined
  const fields = Object.keys({ ...doc, ...previous }).filter(
    (key) => !IGNORED_FIELDS.has(key) && JSON.stringify(doc[key]) !== JSON.stringify(previous[key]),
  )
  const detail: Record<string, unknown> = { fields }
  for (const key of ['status', '_status', 'role', 'disabled']) {
    if (fields.includes(key)) detail[key] = { from: previous[key] ?? null, to: doc[key] ?? null }
  }
  return detail
}

type TitleOf = (doc: Record<string, unknown>) => string | null

/**
 * afterChange/afterDelete hooks for a collection. Requests without a signed-in person are the
 * website (a form) or the system (jobs, scripts). `titleOf` returns null for collections with
 * personal data: their entries carry only the id.
 */
export function auditCollection(area: AuditArea, titleOf: TitleOf) {
  const afterChange: CollectionAfterChangeHook = async ({
    collection,
    context,
    doc,
    operation,
    previousDoc,
    req,
  }) => {
    if (context?.[SKIP_AUDIT]) return doc
    await audit(
      req.payload,
      {
        action: `${collection.slug}.${operation}`,
        area,
        actor: req.user ? undefined : null,
        target: { type: collection.slug, id: doc.id, label: titleOf(doc) },
        detail: {
          ...(operation === 'update' ? describeChange(doc, previousDoc) : {}),
          ...(req.user ? {} : { source: context?.source ?? 'system' }),
        },
      },
      req,
    )
    return doc
  }
  const afterDelete: CollectionAfterDeleteHook = async ({ collection, context, doc, req }) => {
    if (context?.[SKIP_AUDIT]) return doc
    await audit(
      req.payload,
      {
        action: `${collection.slug}.delete`,
        area,
        actor: req.user ? undefined : null,
        target: { type: collection.slug, id: doc.id, label: titleOf(doc) },
      },
      req,
    )
    return doc
  }
  return { afterChange, afterDelete }
}

export const auditGlobal: GlobalAfterChangeHook = async ({
  context,
  doc,
  global,
  previousDoc,
  req,
}) => {
  if (context?.[SKIP_AUDIT]) return doc
  await audit(
    req.payload,
    {
      action: `${global.slug}.update`,
      area: 'content',
      actor: req.user ? undefined : null,
      target: { type: global.slug },
      detail: describeChange(doc, previousDoc),
    },
    req,
  )
  return doc
}
