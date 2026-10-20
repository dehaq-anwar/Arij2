import type { Payload, TaskConfig, Where } from 'payload'

import { adminHref, notify, recipientsWith } from '../membership/notifications'
import { OPEN_STATUSES } from '../membership/stage'

const TIME_ZONE = 'Europe/Berlin'

/** Midnight at the start of the day after `now` in Berlin, as a UTC instant. */
export function startOfTomorrowBerlin(now = new Date()): Date {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(tomorrow)
  const offset =
    new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, timeZoneName: 'shortOffset' })
      .formatToParts(tomorrow)
      .find((part) => part.type === 'timeZoneName')
      ?.value.replace('GMT', '') || '+0'
  const [sign, hours = '0', minutes = '0'] =
    offset.match(/^([+-])(\d+)(?::(\d+))?$/)?.slice(1) ?? []
  const iso = `${day}T00:00:00${sign ?? '+'}${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
  return new Date(iso)
}

const daysAgo = (now: Date, days: number) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()

type Application = { id: number; assignedTo?: number | { id: number } | null }
const assigneeOf = (doc: Application) =>
  doc.assignedTo == null
    ? null
    : typeof doc.assignedTo === 'object'
      ? doc.assignedTo.id
      : doc.assignedTo

/**
 * Daily reminders in the Control Center (no e-mail, no personal data):
 * - follow-up date reached: to the person assigned, or to everyone working on applications;
 * - application received and untouched for the configured number of days;
 * - applicant under 18 without a recorded consent for the configured number of days.
 * A reminder is not repeated while the previous one is unread.
 */
export async function sendMembershipReminders(payload: Payload, now = new Date()) {
  const settings = (await payload.findGlobal({
    slug: 'control-center-settings',
    overrideAccess: true,
    depth: 0,
  })) as { reminders?: { waitingDays?: number | null; consentDays?: number | null } }
  const waitingDays = settings.reminders?.waitingDays ?? 7
  const consentDays = settings.reminders?.consentDays ?? 14
  const team = await recipientsWith(payload, 'inbox.write')
  const open: Where = { status: { in: [...OPEN_STATUSES] } }
  const find = (where: Where) =>
    payload.find({
      collection: 'membership-applications',
      where,
      limit: 500,
      depth: 0,
      overrideAccess: true,
      select: { assignedTo: true },
    })

  const [due, waiting, consent] = await Promise.all([
    find({
      and: [open, { followUpOn: { less_than: startOfTomorrowBerlin(now).toISOString() } }],
    }),
    find({
      and: [
        { status: { equals: 'received' } },
        { updatedAt: { less_than: daysAgo(now, waitingDays) } },
      ],
    }),
    find({
      and: [
        open,
        { under18: { equals: true } },
        { 'guardian.consentReceivedAt': { exists: false } },
        { createdAt: { less_than: daysAgo(now, consentDays) } },
      ],
    }),
  ])

  let sent = 0
  const remind = async (
    kind: 'followUpDue' | 'applicationWaiting' | 'consentPending',
    docs: Application[],
  ) => {
    for (const doc of docs) {
      const assignee = assigneeOf(doc)
      sent += await notify(payload, {
        kind,
        recipients: assignee && team.includes(assignee) ? [assignee] : team,
        subjectType: 'membership-applications',
        subjectId: doc.id,
        href: adminHref('membership-applications', doc.id),
        dedupe: kind === 'followUpDue' ? 'day' : 'unread',
      })
    }
  }
  await remind('followUpDue', due.docs as Application[])
  await remind('applicationWaiting', waiting.docs as Application[])
  await remind('consentPending', consent.docs as Application[])
  return {
    followUps: due.docs.length,
    waiting: waiting.docs.length,
    consent: consent.docs.length,
    sent,
  }
}

/** Every morning at 06:00 UTC (7 or 8 o'clock in Germany). */
export const membershipRemindersTask: TaskConfig = {
  slug: 'membership-reminders',
  label: 'Reminders for open membership applications',
  schedule: [{ cron: '0 6 * * *', queue: 'maintenance' }],
  retries: 2,
  outputSchema: [{ name: 'sent', type: 'number' }],
  handler: async ({ req }) => {
    const result = await sendMembershipReminders(req.payload)
    req.payload.logger.info(result, 'Membership reminders')
    return { output: { sent: result.sent } }
  },
}
