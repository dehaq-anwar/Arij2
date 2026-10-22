import type { Payload, PayloadRequest, TaskConfig } from 'payload'

import { SKIP_AUDIT } from '../audit/log'
import { notify, recipientsWith } from '../membership/notifications'
import {
  agentRead,
  agentSetup,
  AgentError,
  type AgentEvent,
  type AgentSetup,
  type AgentStatus,
  type CertificateStatus,
} from './agent'
import { operationsAlerts, type OperationsAlert } from './alerts'
import { databaseFigures, type DatabaseFigures } from './database'
import { sendOperationsAlertEmail } from './alert-email'

const HOUR = 60 * 60 * 1000

export type OperationsState = {
  lastContactAt?: string | null
  lastAttemptAt?: string | null
  lastError?: string | null
  failingSince?: string | null
  lastSampleAt?: string | null
  lastEventAt?: string | null
  status?: AgentStatus | null
  certificates?: CertificateStatus[] | null
  certificatesCheckedAt?: string | null
  database?: DatabaseFigures | null
  accessCollectedUntil?: string | null
}

export async function readOperationsState(payload: Payload, req?: PayloadRequest) {
  return (await payload.findGlobal({
    slug: 'operations-state',
    overrideAccess: true,
    depth: 0,
    ...(req ? { req } : {}),
  })) as unknown as OperationsState
}

export async function writeOperationsState(
  payload: Payload,
  data: OperationsState,
  req?: PayloadRequest,
) {
  await payload.updateGlobal({
    slug: 'operations-state',
    data: data as never,
    overrideAccess: true,
    depth: 0,
    context: { [SKIP_AUDIT]: true },
    ...(req ? { req } : {}),
  })
}

/** Stores the agent's events the Control Center has not seen; returns the new ones. */
async function mirrorEvents(payload: Payload, events: AgentEvent[], req?: PayloadRequest) {
  if (!events.length) return []
  const known = await payload.find({
    collection: 'ops-events',
    where: { eventId: { in: events.map((e) => e.id) } },
    limit: events.length,
    depth: 0,
    overrideAccess: true,
    select: { eventId: true },
    ...(req ? { req } : {}),
  })
  const seen = new Set(known.docs.map((doc) => (doc as { eventId: string }).eventId))
  const fresh = events.filter((event) => !seen.has(event.id))
  for (const event of fresh) {
    await payload.create({
      collection: 'ops-events',
      data: {
        eventId: event.id,
        kind: event.kind,
        trigger: event.trigger,
        startedAt: event.startedAt,
        finishedAt: event.finishedAt,
        ok: event.ok,
        detail: event.detail,
      },
      overrideAccess: true,
      depth: 0,
      ...(req ? { req } : {}),
    })
  }
  return fresh
}

export async function lastGoodBackupAt(payload: Payload, req?: PayloadRequest) {
  const { docs } = await payload.find({
    collection: 'ops-events',
    where: { and: [{ kind: { equals: 'backup' } }, { ok: { equals: true } }] },
    sort: '-finishedAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
    ...(req ? { req } : {}),
  })
  const at = (docs[0] as { finishedAt?: string } | undefined)?.finishedAt
  return at ? new Date(at) : null
}

/** In the bell of everyone who may act on operations, and by e-mail to the technical address. */
export async function deliverAlerts(
  payload: Payload,
  alerts: OperationsAlert[],
  req?: PayloadRequest,
) {
  if (!alerts.length) return 0
  const recipients = await recipientsWith(payload, 'operations.act', req)
  let delivered = 0
  for (const alert of alerts) {
    const created = await notify(
      payload,
      {
        kind: alert.kind,
        recipients,
        subjectType: 'operations',
        subjectId: alert.subject,
        href: alert.href,
        dedupe: 'day',
      },
      req,
    )
    // E-mail only when the notice is new, so the address gets it once a day at most as well.
    if (created > 0 || !recipients.length) {
      delivered++
      await sendOperationsAlertEmail(payload, alert, req)
    }
  }
  return delivered
}

export type CollectResult = {
  configured: boolean
  reachable: boolean
  samples: number
  events: number
  alerts: number
}

/**
 * Every five minutes (task `ops-collect`): database figures, the agent's status, new host
 * samples and events, the certificates once an hour, then the warnings. Without an agent only
 * the database figures are kept and the screens say "not set up".
 */
export async function collectOperations(
  payload: Payload,
  {
    now = new Date(),
    setup = agentSetup(),
    req,
  }: { now?: Date; setup?: AgentSetup; req?: PayloadRequest } = {},
): Promise<CollectResult> {
  const state = await readOperationsState(payload, req)
  const database = await databaseFigures(payload, now).catch(() => state.database ?? null)
  const result: CollectResult = {
    configured: Boolean(setup),
    reachable: false,
    samples: 0,
    events: 0,
    alerts: 0,
  }
  if (!setup) {
    await writeOperationsState(
      payload,
      {
        database,
        lastAttemptAt: now.toISOString(),
        lastError: 'not_configured',
        failingSince: null,
      },
      req,
    )
    return result
  }

  let status: AgentStatus | null = null
  let error: string | null = null
  try {
    status = await agentRead('/v1/status', {}, { setup })
  } catch (e) {
    error = e instanceof AgentError ? (e.code ?? e.reason) : 'failed'
  }
  const next: OperationsState = {
    database,
    lastAttemptAt: now.toISOString(),
    lastError: error,
  }
  let newEvents: AgentEvent[] = []
  let latestSample = null
  let certificates = state.certificates ?? null

  if (status) {
    result.reachable = true
    next.status = status
    next.lastContactAt = now.toISOString()
    next.failingSince = null

    const { samples } = await agentRead(
      '/v1/metrics',
      { since: state.lastSampleAt ?? null },
      { setup },
    )
    for (const sample of samples) {
      try {
        await payload.create({
          collection: 'ops-samples',
          data: {
            at: sample.at,
            cpuPercent: sample.cpuPercent,
            memoryUsed: sample.memoryUsedBytes,
            memoryTotal: sample.memoryTotalBytes,
            load1: sample.load1,
            diskUsed: sample.diskUsedBytes,
            diskTotal: sample.diskTotalBytes,
            databaseBytes: database?.bytes ?? null,
          },
          overrideAccess: true,
          depth: 0,
          ...(req ? { req } : {}),
        })
        result.samples++
      } catch {
        // Already stored (the agent sends everything after the cursor, inclusive of clock skew).
      }
    }
    latestSample = samples.at(-1) ?? null
    if (latestSample) next.lastSampleAt = latestSample.at

    const { events } = await agentRead(
      '/v1/events',
      { since: state.lastEventAt ?? null },
      { setup },
    )
    newEvents = await mirrorEvents(payload, events, req)
    result.events = newEvents.length
    const newest = events
      .map((e) => e.finishedAt)
      .sort()
      .at(-1)
    if (newest) next.lastEventAt = newest

    const checkedAt = state.certificatesCheckedAt ? new Date(state.certificatesCheckedAt) : null
    if (!checkedAt || now.getTime() - checkedAt.getTime() >= HOUR) {
      try {
        certificates = (await agentRead('/v1/certificates', {}, { setup, timeoutMs: 30_000 }))
          .certificates
        next.certificates = certificates
        next.certificatesCheckedAt = now.toISOString()
      } catch {
        // Tried again on the next run.
      }
    }
  } else {
    next.failingSince = state.failingSince ?? now.toISOString()
  }

  const alerts = operationsAlerts({
    now,
    failingSince: next.failingSince ? new Date(next.failingSince) : null,
    status,
    newEvents,
    lastGoodBackupAt: await lastGoodBackupAt(payload, req),
    certificates: status ? certificates : null,
    latestSample,
  })
  result.alerts = await deliverAlerts(payload, alerts, req)
  await writeOperationsState(payload, next, req)
  return result
}

export const opsCollectTask: TaskConfig = {
  slug: 'ops-collect',
  label: 'Collect server status, samples and backup results',
  schedule: [{ cron: '*/5 * * * *', queue: 'operations' }],
  retries: 0,
  outputSchema: [
    { name: 'configured', type: 'checkbox' },
    { name: 'reachable', type: 'checkbox' },
    { name: 'samples', type: 'number' },
    { name: 'events', type: 'number' },
    { name: 'alerts', type: 'number' },
  ],
  handler: async ({ req }) => ({ output: await collectOperations(req.payload, { req }) }),
}
