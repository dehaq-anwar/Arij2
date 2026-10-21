import type { Endpoint, PayloadRequest } from 'payload'

import { allowed } from '../access/roles'
import { audit } from '../audit/log'
import { hasFreshStepUp, isVerifiedSession } from '../auth/session-state'
import { recordCaseEvent } from './events'
import { adminHref, notify, recipientsWith } from './notifications'

/**
 * The review after a membership ends (decision of 2026-10-20): the data are kept while the
 * membership lasts; when it ends, the entry is reviewed — what is no longer needed goes, and what
 * must be kept for legal, accounting or evidence reasons is kept until a date, with the reason.
 * Nothing is deleted automatically: the review is a person's decision, recorded in the history
 * and the audit log. At the date the entry is due for review again.
 */
export const REVIEW_OUTCOMES = ['pending', 'retainedAll', 'retainedMinimal'] as const
export type ReviewOutcome = (typeof REVIEW_OUTCOMES)[number]
export const RETENTION_REASONS = ['legal', 'accounting', 'proof', 'other'] as const
export type RetentionReason = (typeof RETENTION_REASONS)[number]

/** Context flag: the review fields may change (set by the review endpoint only). */
export const MEMBER_REVIEW = 'memberReview'
export const REVIEW_FIELDS = [
  'reviewDueOn',
  'reviewOutcome',
  'retainUntil',
  'retentionReason',
  'retentionNote',
  'reviewedOn',
  'reviewedByName',
  'contactDataRemovedOn',
] as const

const DAY = 24 * 60 * 60 * 1000
const MAX_YEARS = 30

/** The day the review is due: the end of the membership plus the configured days. */
export function reviewDueOn(endedOn: string, days: number): string {
  const end = new Date(endedOn)
  return new Date(end.getTime() + Math.max(0, Math.floor(days)) * DAY).toISOString()
}

export type ReviewRequest = {
  keep: 'all' | 'minimal'
  until: string
  reason: RetentionReason
  note: string | null
}

/**
 * Checks a review decision: keep everything or only the minimal record (name, type, dates, the
 * link to the application) until a future date, for a stated reason; "other" needs a note.
 */
export function parseReview(
  body: unknown,
  now = new Date(),
): { ok: true; review: ReviewRequest } | { ok: false; error: string } {
  const input = (body ?? {}) as Record<string, unknown>
  if (input.keep !== 'all' && input.keep !== 'minimal') return { ok: false, error: 'keep' }
  const until = typeof input.until === 'string' ? new Date(input.until) : null
  if (!until || Number.isNaN(until.getTime())) return { ok: false, error: 'until' }
  const latest = new Date(now)
  latest.setFullYear(latest.getFullYear() + MAX_YEARS)
  if (until.getTime() <= now.getTime() || until.getTime() > latest.getTime()) {
    return { ok: false, error: 'until' }
  }
  if (!(RETENTION_REASONS as readonly string[]).includes(input.reason as string)) {
    return { ok: false, error: 'reason' }
  }
  const note = typeof input.note === 'string' ? input.note.replace(/\s+/g, ' ').trim() : ''
  if (note.length > 300 || (input.reason === 'other' && note.length < 5)) {
    return { ok: false, error: 'note' }
  }
  return {
    ok: true,
    review: {
      keep: input.keep,
      until: until.toISOString(),
      reason: input.reason as RetentionReason,
      note: note || null,
    },
  }
}

/** What "keep only the minimal record" removes: the ways to contact the person. */
export const CONTACT_DATA = {
  email: null,
  address: { street: null, postalCode: null, city: null, country: null },
} as const

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

type MemberDoc = {
  id: number
  status?: string
  minorAtAdmission?: boolean
  guardian?: { consentReceivedAt?: string | null } | null
  contactDataRemovedOn?: string | null
}

async function review(req: PayloadRequest): Promise<Response> {
  if (!req.user || !(await isVerifiedSession(req))) return json({ error: 'not_signed_in' }, 401)
  if (!(await allowed(req, 'members.write'))) return json({ error: 'not_allowed' }, 403)
  const id = Number(req.routeParams?.id)
  const member = Number.isInteger(id)
    ? ((await req.payload
        .findByID({ collection: 'members', id, depth: 0, overrideAccess: true, req })
        .catch(() => null)) as MemberDoc | null)
    : null
  if (!member) return json({ error: 'not_found' }, 404)
  if (member.status !== 'ended') return json({ error: 'not_ended' }, 409)
  const parsed = parseReview(await req.json?.().catch(() => null))
  if (!parsed.ok) return json({ error: parsed.error }, 400)
  const { keep, until, reason, note } = parsed.review
  if (keep === 'all' && member.contactDataRemovedOn) return json({ error: 'already_minimal' }, 409)
  // Removing data is a sensitive change: a fresh code, as for deleting.
  const removes = keep === 'minimal' && !member.contactDataRemovedOn
  if (removes && !(await hasFreshStepUp(req))) return json({ error: 'step_up_required' }, 403)

  const now = new Date().toISOString()
  const outcome = keep === 'all' ? 'retainedAll' : 'retainedMinimal'
  await req.payload.update({
    collection: 'members',
    id,
    data: {
      ...(removes
        ? {
            ...CONTACT_DATA,
            guardian: {
              name: null,
              email: null,
              // The date of the guardian's consent stays: it proves the admission was valid.
              consentReceivedAt: member.guardian?.consentReceivedAt ?? null,
            },
            contactDataRemovedOn: now,
          }
        : {}),
      reviewOutcome: outcome,
      retainUntil: until,
      reviewDueOn: until,
      retentionReason: reason,
      retentionNote: note,
      reviewedOn: now,
      reviewedByName: (req.user as { name?: string }).name ?? null,
    },
    overrideAccess: true,
    context: { [MEMBER_REVIEW]: true },
    req,
  })
  await recordCaseEvent(
    req.payload,
    {
      event: 'member.reviewed',
      member: id,
      to: outcome,
      detail: { until, reason, contactDataRemoved: removes },
    },
    req,
  )
  await audit(
    req.payload,
    {
      action: 'member.reviewed',
      area: 'association',
      stepUp: removes,
      target: { type: 'members', id },
      detail: { outcome, until, reason, contactDataRemoved: removes },
    },
    req,
  )
  if (removes) {
    const recipients = (await recipientsWith(req.payload, 'users.manage', req)).filter(
      (recipient) => recipient !== Number(req.user?.id),
    )
    await notify(
      req.payload,
      {
        kind: 'memberReduced',
        recipients,
        subjectType: 'members',
        subjectId: id,
        href: adminHref('members', id),
      },
      req,
    )
  }
  return json({ ok: true, outcome })
}

/** POST /api/members/:id/review { keep: 'all' | 'minimal', until, reason, note } */
export const memberEndpoints: Endpoint[] = [
  { path: '/:id/review', method: 'post', handler: review },
]
