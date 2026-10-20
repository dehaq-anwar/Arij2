import type { Where } from 'payload'

/**
 * Where an application stands. "Consent pending" is not a status of its own: it is an open
 * application of someone under 18 without a recorded consent date, which cannot be accepted yet
 * (the rule from Phase 5, unchanged).
 */
export const APPLICATION_STATUSES = ['received', 'inReview', 'accepted', 'rejected'] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]
export const OPEN_STATUSES: readonly ApplicationStatus[] = ['received', 'inReview']

export const STAGES = ['received', 'inReview', 'consentPending', 'accepted', 'rejected'] as const
export type Stage = (typeof STAGES)[number]

/** List filters: a stage, all open applications, or everything. */
export const STAGE_FILTERS = ['open', ...STAGES, 'all'] as const
export type StageFilter = (typeof STAGE_FILTERS)[number]

export type ApplicationLike = {
  status?: string | null
  under18?: boolean | null
  guardian?: { consentReceivedAt?: string | null } | null
}

export const MEMBERSHIP_TYPE_VALUES: readonly string[] = ['ordinary', 'supporting']

export const isOpen = (status: unknown): boolean =>
  OPEN_STATUSES.includes(status as ApplicationStatus)

export function stageOf(application: ApplicationLike): Stage {
  const status = (application.status ?? 'received') as ApplicationStatus
  if (status === 'accepted' || status === 'rejected') return status
  if (application.under18 && !application.guardian?.consentReceivedAt) return 'consentPending'
  return status === 'inReview' ? 'inReview' : 'received'
}

const consentMissing: Where = {
  and: [{ under18: { equals: true } }, { 'guardian.consentReceivedAt': { exists: false } }],
}
const consentNotMissing: Where = {
  or: [{ under18: { not_equals: true } }, { 'guardian.consentReceivedAt': { exists: true } }],
}

export function stageWhere(filter: StageFilter): Where | null {
  switch (filter) {
    case 'all':
      return null
    case 'open':
      return { status: { in: [...OPEN_STATUSES] } }
    case 'consentPending':
      return { and: [{ status: { in: [...OPEN_STATUSES] } }, consentMissing] }
    case 'received':
    case 'inReview':
      return { and: [{ status: { equals: filter } }, consentNotMissing] }
    case 'accepted':
    case 'rejected':
      return { status: { equals: filter } }
  }
}

export const isStageFilter = (value: unknown): value is StageFilter =>
  (STAGE_FILTERS as readonly string[]).includes(value as string)

/** Members: active, ended, or all. */
export const MEMBER_STATUSES = ['active', 'ended'] as const
export type MemberStatus = (typeof MEMBER_STATUSES)[number]
export const MEMBER_FILTERS = ['active', 'ended', 'all'] as const
export type MemberFilter = (typeof MEMBER_FILTERS)[number]
export const isMemberFilter = (value: unknown): value is MemberFilter =>
  (MEMBER_FILTERS as readonly string[]).includes(value as string)

/** Free-text search over name and e-mail (case-insensitive, Payload's `like`). */
export function searchWhere(query: string | null | undefined): Where | null {
  const text = (query ?? '').trim().slice(0, 100)
  if (!text) return null
  return {
    or: [{ firstName: { like: text } }, { lastName: { like: text } }, { email: { like: text } }],
  }
}

export const and = (...parts: (Where | null | undefined)[]): Where => {
  const present = parts.filter((part): part is Where => Boolean(part))
  return present.length === 0 ? {} : present.length === 1 ? present[0]! : { and: present }
}
