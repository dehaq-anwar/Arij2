import { describe, expect, it } from 'vitest'

import {
  notificationRetentionWhere,
  READ_NOTIFICATION_DAYS,
  UNREAD_NOTIFICATION_DAYS,
} from '@/cms/jobs/notifications-retention'
import {
  MOVED_FIELDS,
  movedData,
  planConsolidation,
  PROOF_FIELDS,
  proofChanges,
} from '@/cms/membership/consolidate'
import { parseReview, reviewDueOn } from '@/cms/membership/review'
import { memberWhere } from '@/cms/membership/stage'

const now = new Date('2026-10-21T10:00:00Z')

describe('notifications are kept 30 days once read, 90 days unread', () => {
  it('uses the periods the association decided', () => {
    expect([READ_NOTIFICATION_DAYS, UNREAD_NOTIFICATION_DAYS]).toEqual([30, 90])
    expect(notificationRetentionWhere(now)).toEqual({
      or: [
        { readAt: { less_than: '2026-09-21T10:00:00.000Z' } },
        {
          and: [
            { readAt: { exists: false } },
            { createdAt: { less_than: '2026-07-23T10:00:00.000Z' } },
          ],
        },
      ],
    })
  })
})

describe('review after the end of a membership', () => {
  it('is due the configured days after the end (0 = at once)', () => {
    expect(reviewDueOn('2026-10-01T12:00:00.000Z', 0)).toBe('2026-10-01T12:00:00.000Z')
    expect(reviewDueOn('2026-10-01T12:00:00.000Z', 30)).toBe('2026-10-31T12:00:00.000Z')
    expect(reviewDueOn('2026-10-01T12:00:00.000Z', -5)).toBe('2026-10-01T12:00:00.000Z')
  })

  it('keeps data only until a future date, for a stated reason', () => {
    const ok = parseReview(
      { keep: 'minimal', until: '2036-12-31', reason: 'accounting', note: '  Belege  ' },
      now,
    )
    expect(ok).toEqual({
      ok: true,
      review: {
        keep: 'minimal',
        until: '2036-12-31T00:00:00.000Z',
        reason: 'accounting',
        note: 'Belege',
      },
    })
    expect(parseReview({ keep: 'all', until: '2027-01-01', reason: 'proof' }, now).ok).toBe(true)
    // Not indefinitely: a date is required, in the future, at most 30 years ahead.
    for (const until of [undefined, '', 'bald', '2026-10-20', '2060-01-01']) {
      expect(parseReview({ keep: 'all', until, reason: 'legal' }, now), String(until)).toEqual({
        ok: false,
        error: 'until',
      })
    }
    expect(parseReview({ keep: 'nothing', until: '2027-01-01', reason: 'legal' }, now)).toEqual({
      ok: false,
      error: 'keep',
    })
    expect(parseReview({ keep: 'all', until: '2027-01-01', reason: 'because' }, now)).toEqual({
      ok: false,
      error: 'reason',
    })
    // "Other" needs an explanation; notes are short.
    expect(parseReview({ keep: 'all', until: '2027-01-01', reason: 'other' }, now)).toEqual({
      ok: false,
      error: 'note',
    })
    expect(
      parseReview({ keep: 'all', until: '2027-01-01', reason: 'other', note: 'x'.repeat(301) }, now)
        .ok,
    ).toBe(false)
  })

  it('has a tab for entries whose review date has come', () => {
    expect(memberWhere('review', now)).toEqual({
      and: [
        { status: { equals: 'ended' } },
        { reviewDueOn: { less_than_equal: now.toISOString() } },
      ],
    })
    expect(memberWhere('all')).toBeNull()
    expect(memberWhere('ended')).toEqual({ status: { equals: 'ended' } })
  })
})

describe('moving the personal data of accepted applications (switched off)', () => {
  const application = {
    id: 12,
    status: 'accepted',
    firstName: 'Erika',
    lastName: 'Beispiel',
    email: 'erika@example.test',
    address: { street: 'Alt 1', postalCode: '24103', city: 'Kiel', country: 'Deutschland' },
    membershipType: 'ordinary',
    declarations: { atLeast16: true, principles: true, fees: true },
    under18: true,
    guardian: { name: 'Petra', email: 'p@example.test', consentReceivedAt: '2026-10-01T00:00:00Z' },
    consent: { given: true, at: '2026-10-01T09:00:00Z', text: 'Wortlaut', version: '1' },
    decisionDate: '2026-10-02T09:00:00Z',
    decidedBy: 3,
    locale: 'de',
    createdAt: '2026-10-01T09:00:00Z',
    internalNotes: '',
  }
  const member = {
    id: 40,
    firstName: 'Erika',
    lastName: 'Beispiel',
    email: 'erika@example.test',
    address: { street: 'Neu 2', postalCode: '24103', city: 'Kiel', country: 'Deutschland' },
    guardian: { name: 'Petra', email: 'p@example.test' },
  }

  it('moves names, e-mail, address and the guardian’s contact; reports outdated copies', () => {
    const plan = planConsolidation(application, [member])
    expect(plan).toMatchObject({ application: 12, member: 40, action: 'move' })
    expect(plan.clears).toEqual([...MOVED_FIELDS])
    expect(plan.differences).toEqual(['address.street'])
  })

  it('skips what a person has to look at first', () => {
    expect(planConsolidation({ ...application, status: 'inReview' }, [member]).reason).toBe(
      'not_accepted',
    )
    expect(planConsolidation(application, []).reason).toBe('no_member')
    expect(planConsolidation(application, [member, { ...member, id: 41 }]).reason).toBe(
      'several_members',
    )
    expect(planConsolidation({ ...application, internalNotes: 'Rückruf' }, [member]).reason).toBe(
      'notes',
    )
    expect(
      planConsolidation({ ...application, personalDataMovedOn: '2026-10-21' }, [member]).reason,
    ).toBe('already_moved')
  })

  it('keeps every proof field exactly as it is', () => {
    const after = { ...application, ...movedData(application, now.toISOString()) }
    expect(proofChanges(application, after)).toEqual([])
    expect(after).toMatchObject({
      firstName: null,
      email: null,
      address: { street: null, postalCode: null, city: null, country: null },
      guardian: { name: null, email: null, consentReceivedAt: '2026-10-01T00:00:00Z' },
      personalDataMovedOn: now.toISOString(),
    })
    expect(PROOF_FIELDS).toEqual(
      expect.arrayContaining([
        'consent',
        'declarations',
        'decisionDate',
        'guardian.consentReceivedAt',
      ]),
    )
    // Any change to the proof is noticed.
    expect(proofChanges(application, { ...after, decidedBy: { id: 4 } })).toEqual(['decidedBy'])
    expect(proofChanges(application, { ...after, consent: { given: false } })).toEqual(['consent'])
  })
})
