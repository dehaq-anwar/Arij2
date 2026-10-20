import type { Payload, PayloadRequest } from 'payload'

/**
 * The case history of an application or a member (who, when, what, from → to). Written only by
 * the server's hooks; nobody can change or delete an entry through the admin or the API. Entries
 * are deleted together with their application or member, so they never outlive the record.
 * Values are statuses, dates and account names, never the person's data.
 */
export const CASE_EVENTS = [
  'application.received',
  'application.status',
  'application.consent',
  'application.assigned',
  'application.followUp',
  'member.created',
  'member.updated',
  'member.ended',
  'member.reactivated',
] as const
export type CaseEventKind = (typeof CASE_EVENTS)[number]

export type CaseEventInput = {
  event: CaseEventKind
  application?: number | null
  member?: number | null
  from?: string | null
  to?: string | null
  detail?: Record<string, unknown> | null
}

export async function recordCaseEvent(
  payload: Payload,
  input: CaseEventInput,
  req?: PayloadRequest,
) {
  const actor = req?.user as { id: number; name?: string | null } | null | undefined
  try {
    await payload.create({
      collection: 'case-events',
      data: {
        event: input.event,
        application: input.application ?? null,
        member: input.member ?? null,
        from: input.from ?? null,
        to: input.to ?? null,
        detail: input.detail ?? null,
        actorId: actor ? Number(actor.id) : null,
        actorName: actor?.name ?? null,
      },
      overrideAccess: true,
      depth: 0,
      ...(req ? { req } : {}),
    })
  } catch (error) {
    payload.logger.error({ err: error, event: input.event }, 'Could not record a case event')
  }
}

export async function deleteCaseEvents(
  payload: Payload,
  where: { application?: number; member?: number },
  req?: PayloadRequest,
) {
  const key = where.application != null ? 'application' : 'member'
  const id = where.application ?? where.member
  if (id == null) return
  await payload.delete({
    collection: 'case-events',
    where: { [key]: { equals: id } },
    overrideAccess: true,
    depth: 0,
    ...(req ? { req } : {}),
  })
}
