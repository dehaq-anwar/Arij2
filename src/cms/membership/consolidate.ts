import { createLocalReq, type Payload, type PayloadRequest } from 'payload'

import { audit } from '../audit/log'
import { recordCaseEvent } from './events'

/**
 * Accepted applications without a second copy of the person's data (proposal for decision 12,
 * docs/CONTROL-CENTER.md §16). When an application is accepted, its personal data are copied to
 * the members register; afterwards the application only needs what proves the decision and the
 * consent. This moves the personal data out of the application and keeps the proof:
 *
 * - moved (cleared in the application, present in the register entry): first and last name,
 *   e-mail, address, the guardian's name and e-mail;
 * - kept in the application: status, decision date and who decided, type of membership, the
 *   declarations, under 18 and the date of the guardian's consent, the consent record (wording,
 *   time, privacy-policy version), the form language, the date received, the case history and
 *   the link from the register entry;
 * - never touched: the register entry, the audit log, the case history.
 *
 * It is switched off. It runs only when the server setting MEMBERSHIP_CONSOLIDATION is "on":
 * then for every newly accepted application, and through `npm run membership:consolidate --
 * --apply` for those accepted before. Without `--apply` the command only reports what it would
 * do. Each application is moved in its own transaction and checked afterwards; any difference
 * rolls it back.
 */
export const consolidationEnabled = () => process.env.MEMBERSHIP_CONSOLIDATION === 'on'

/** Context flag for the update that moves the data (set only here). */
export const MOVE_PERSONAL_DATA = 'movePersonalData'

/** Paths of the personal data that leave the application. */
export const MOVED_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'address.street',
  'address.postalCode',
  'address.city',
  'address.country',
  'guardian.name',
  'guardian.email',
] as const

/** Paths that prove the decision and the consent and stay exactly as they are. */
export const PROOF_FIELDS = [
  'status',
  'decisionDate',
  'decidedBy',
  'membershipType',
  'declarations',
  'under18',
  'guardian.consentReceivedAt',
  'consent',
  'locale',
  'createdAt',
] as const

type Row = Record<string, unknown>

const at = (row: Row | null | undefined, path: string): unknown =>
  path.split('.').reduce<unknown>((value, key) => (value as Row | null | undefined)?.[key], row)

const present = (value: unknown) => value !== null && value !== undefined && value !== ''
const id = (value: unknown) => (value && typeof value === 'object' ? (value as Row).id : value)
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

export type ConsolidationPlan = {
  application: number
  member: number | null
  action: 'move' | 'skip'
  reason?: 'not_accepted' | 'no_member' | 'several_members' | 'notes' | 'already_moved'
  /** Fields with a value that would be cleared. */
  clears: string[]
  /** Fields whose value in the application differs from the register (outdated copies). */
  differences: string[]
}

/**
 * What would happen to one application. Skipped: not accepted, no register entry or more than
 * one, internal notes still present (they may hold something to keep; a person decides), or
 * already moved.
 */
export function planConsolidation(application: Row, members: Row[]): ConsolidationPlan {
  const base = {
    application: Number(application.id),
    member: members.length === 1 ? Number(members[0]!.id) : null,
    clears: [] as string[],
    differences: [] as string[],
  }
  if (application.personalDataMovedOn) return { ...base, action: 'skip', reason: 'already_moved' }
  if (application.status !== 'accepted') return { ...base, action: 'skip', reason: 'not_accepted' }
  if (!members.length) return { ...base, action: 'skip', reason: 'no_member' }
  if (members.length > 1) return { ...base, action: 'skip', reason: 'several_members' }
  if (typeof application.internalNotes === 'string' && application.internalNotes.trim()) {
    return { ...base, action: 'skip', reason: 'notes' }
  }
  const member = members[0]!
  const clears = MOVED_FIELDS.filter((path) => present(at(application, path)))
  const differences = clears.filter((path) => !same(at(application, path), at(member, path)))
  return { ...base, action: 'move', clears, differences }
}

/** The data of the update that moves the personal data out (proof fields untouched). */
export function movedData(application: Row, now: string): Row {
  return {
    firstName: null,
    lastName: null,
    email: null,
    address: { street: null, postalCode: null, city: null, country: null },
    guardian: {
      name: null,
      email: null,
      consentReceivedAt: at(application, 'guardian.consentReceivedAt') ?? null,
    },
    personalDataMovedOn: now,
  }
}

/** Fields that changed between two states of the application, other than the moved ones. */
export function proofChanges(before: Row, after: Row): string[] {
  return PROOF_FIELDS.filter((path) => {
    const a = at(before, path)
    const b = at(after, path)
    return path === 'decidedBy' ? id(a) !== id(b) : !same(a, b)
  })
}

const read = (
  payload: Payload,
  req: PayloadRequest,
  collection: 'members' | 'membership-applications',
  docId: number,
) =>
  payload.findByID({
    collection,
    id: docId,
    depth: 0,
    overrideAccess: true,
    req,
  }) as unknown as Promise<Row>

/**
 * Moves the personal data of one accepted application (or, without `apply`, reports what would
 * happen). Within `req`'s transaction when given; checks afterwards that the proof and the
 * register entry are unchanged and the personal data are gone, and throws otherwise.
 */
export async function consolidateApplication(
  payload: Payload,
  applicationId: number,
  { apply, req }: { apply: boolean; req: PayloadRequest },
): Promise<ConsolidationPlan> {
  const application = await read(payload, req, 'membership-applications', applicationId)
  const { docs: members } = await payload.find({
    collection: 'members',
    where: { application: { equals: applicationId } },
    depth: 0,
    limit: 2,
    overrideAccess: true,
    req,
  })
  const plan = planConsolidation(application, members as unknown as Row[])
  if (plan.action !== 'move' || !apply) return plan

  const member = members[0] as unknown as Row
  await payload.update({
    collection: 'membership-applications',
    id: applicationId,
    data: movedData(application, new Date().toISOString()),
    overrideAccess: true,
    context: { [MOVE_PERSONAL_DATA]: true, disableRevalidate: true },
    req,
  })

  const after = await read(payload, req, 'membership-applications', applicationId)
  const memberAfter = await read(payload, req, 'members', Number(member.id))
  const changedProof = proofChanges(application, after)
  const leftOver = MOVED_FIELDS.filter((path) => present(at(after, path)))
  const memberChanged = !same({ ...member, updatedAt: null }, { ...memberAfter, updatedAt: null })
  if (changedProof.length || leftOver.length || memberChanged) {
    throw new Error(
      `Application ${applicationId}: check failed (proof ${changedProof.join(',') || 'ok'}, left ${leftOver.join(',') || 'none'}, register ${memberChanged ? 'changed' : 'ok'})`,
    )
  }
  await recordCaseEvent(
    payload,
    { event: 'application.moved', application: applicationId, member: Number(member.id) },
    req,
  )
  await audit(
    payload,
    {
      action: 'application.consolidated',
      area: 'association',
      target: { type: 'membership-applications', id: applicationId },
      detail: { member: Number(member.id), fields: plan.clears },
    },
    req,
  )
  return plan
}

/**
 * All accepted applications, each in its own transaction (a failed check rolls back only that
 * one). Returns the plans, for the report.
 */
export async function consolidateAll(payload: Payload, { apply }: { apply: boolean }) {
  const { docs } = await payload.find({
    collection: 'membership-applications',
    where: {
      and: [{ status: { equals: 'accepted' } }, { personalDataMovedOn: { exists: false } }],
    },
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
  })
  const results: (ConsolidationPlan | { application: number; error: string })[] = []
  for (const doc of docs) {
    const req = await createLocalReq({}, payload)
    const transaction = apply ? await payload.db.beginTransaction() : null
    if (transaction) req.transactionID = transaction
    try {
      results.push(await consolidateApplication(payload, Number(doc.id), { apply, req }))
      if (transaction) await payload.db.commitTransaction(transaction)
    } catch (error) {
      if (transaction) await payload.db.rollbackTransaction(transaction)
      results.push({ application: Number(doc.id), error: (error as Error).message })
    }
  }
  return results
}
