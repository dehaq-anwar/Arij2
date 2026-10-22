import type { Endpoint, PayloadRequest } from 'payload'

import { can, type Permission, type PermissionSubject } from '../access/permissions'
import { audit } from '../audit/log'
import { hasFreshStepUp, isVerifiedSession } from '../auth/session-state'
import { agentAct, agentRead, AgentError, agentSetup } from './agent'
import { collectOperations, readOperationsState, writeOperationsState } from './collect'

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

type Person = PermissionSubject & { id: number }

/** Signed in with both factors and holding the permission; otherwise the answer to send. */
async function guard(req: PayloadRequest, permission: Permission): Promise<Response | Person> {
  if (!req.user || !(await isVerifiedSession(req))) return json({ error: 'not_signed_in' }, 401)
  const person = req.user as unknown as Person
  if (!can(person, permission)) return json({ error: 'not_allowed' }, 403)
  return person
}

const body = async (req: PayloadRequest) =>
  ((await req.json?.().catch(() => null)) ?? {}) as Record<string, unknown>

/** The agent's refusals as answers the screens understand. */
function agentFailure(error: unknown): Response {
  if (!(error instanceof AgentError)) return json({ error: 'failed' }, 502)
  if (error.reason === 'not_configured') return json({ error: 'not_configured' }, 409)
  if (error.reason === 'unreachable') return json({ error: 'unreachable' }, 502)
  const status = error.code === 'too_many' ? 429 : error.code === 'busy' ? 409 : 502
  return json({ error: error.code ?? 'refused' }, status)
}

/** Services the Control Center may restart (the agent and the socket proxy check again). */
export const RESTARTABLE_SERVICES = ['app', 'caddy'] as const

/**
 * Jobs that may be started by hand (`jobs.run`). Those that delete anything need a fresh code;
 * they delete only what their rules already allow, exactly as at night.
 */
export const MANUAL_JOBS: Record<string, { deletes: boolean; queue: string }> = {
  'ops-collect': { deletes: false, queue: 'operations' },
  'analytics-collect': { deletes: false, queue: 'operations' },
  'membership-reminders': { deletes: false, queue: 'maintenance' },
  retention: { deletes: true, queue: 'maintenance' },
  'auth-cleanup': { deletes: true, queue: 'maintenance' },
  'audit-retention': { deletes: true, queue: 'maintenance' },
  'notifications-retention': { deletes: true, queue: 'maintenance' },
  'ops-retention': { deletes: true, queue: 'maintenance' },
}

async function restart(req: PayloadRequest) {
  const person = await guard(req, 'operations.act')
  if (person instanceof Response) return person
  const { service, confirm } = await body(req)
  if (!RESTARTABLE_SERVICES.includes(service as (typeof RESTARTABLE_SERVICES)[number])) {
    return json({ error: 'service' }, 400)
  }
  if (!(await hasFreshStepUp(req))) return json({ error: 'step_up_required' }, 403)
  // Typed confirmation: the service's name, so a restart is never a slip of the mouse.
  if (confirm !== service) return json({ error: 'confirm' }, 400)
  try {
    await agentAct('/v1/restart', { service })
  } catch (error) {
    await audit(
      req.payload,
      {
        action: 'ops.restart',
        area: 'operations',
        result: 'failed',
        stepUp: true,
        target: { type: 'service', id: String(service), label: String(service) },
        detail: { error: error instanceof AgentError ? (error.code ?? error.reason) : 'failed' },
      },
      req,
    )
    return agentFailure(error)
  }
  // Written before the restart takes effect (restarting the app ends this request's process).
  await audit(
    req.payload,
    {
      action: 'ops.restart',
      area: 'operations',
      stepUp: true,
      target: { type: 'service', id: String(service), label: String(service) },
    },
    req,
  )
  return json({ accepted: true, service }, 202)
}

function startJob(kind: 'backup' | 'drill') {
  return async (req: PayloadRequest) => {
    const person = await guard(req, 'operations.act')
    if (person instanceof Response) return person
    if (!(await hasFreshStepUp(req))) return json({ error: 'step_up_required' }, 403)
    try {
      await agentAct(kind === 'backup' ? '/v1/backup' : '/v1/drill')
    } catch (error) {
      await audit(
        req.payload,
        {
          action: `ops.${kind}`,
          area: 'operations',
          result: 'failed',
          stepUp: true,
          detail: { error: error instanceof AgentError ? (error.code ?? error.reason) : 'failed' },
        },
        req,
      )
      return agentFailure(error)
    }
    await audit(req.payload, { action: `ops.${kind}`, area: 'operations', stepUp: true }, req)
    return json({ accepted: true, kind }, 202)
  }
}

async function logs(req: PayloadRequest) {
  const person = await guard(req, 'operations.read')
  if (person instanceof Response) return person
  const url = new URL(req.url ?? '', 'http://local')
  const service = url.searchParams.get('service') ?? ''
  const lines = Math.min(500, Math.max(20, Number(url.searchParams.get('lines')) || 200))
  try {
    const result = await agentRead('/v1/logs', { service, lines })
    // Reading logs is recorded (they are masked, but they are the server's inner workings).
    await audit(
      req.payload,
      {
        action: 'ops.logs_read',
        area: 'operations',
        target: { type: 'service', id: service, label: service },
        detail: { lines },
      },
      req,
    )
    return json(result)
  } catch (error) {
    if (error instanceof AgentError && error.code === 'service') {
      return json({ error: 'service' }, 400)
    }
    return agentFailure(error)
  }
}

async function certificates(req: PayloadRequest) {
  const person = await guard(req, 'operations.read')
  if (person instanceof Response) return person
  try {
    const result = await agentRead('/v1/certificates', {}, { timeoutMs: 30_000 })
    await writeOperationsState(
      req.payload,
      { certificates: result.certificates, certificatesCheckedAt: new Date().toISOString() },
      req,
    )
    return json(result)
  } catch (error) {
    return agentFailure(error)
  }
}

/** "Check now": the collection job right away, at most every 30 seconds. */
async function refresh(req: PayloadRequest) {
  const person = await guard(req, 'operations.read')
  if (person instanceof Response) return person
  const state = await readOperationsState(req.payload, req)
  const last = state.lastAttemptAt ? new Date(state.lastAttemptAt).getTime() : 0
  if (Date.now() - last < 30_000) return json({ error: 'too_soon' }, 429)
  const result = await collectOperations(req.payload, { setup: agentSetup() })
  return json(result)
}

async function runJob(req: PayloadRequest) {
  const person = await guard(req, 'jobs.run')
  if (person instanceof Response) return person
  const { task } = await body(req)
  const job = typeof task === 'string' ? MANUAL_JOBS[task] : undefined
  if (!job) return json({ error: 'task' }, 400)
  if (job.deletes && !(await hasFreshStepUp(req))) {
    return json({ error: 'step_up_required' }, 403)
  }
  type QueueArgs = Parameters<typeof req.payload.jobs.queue>[0]
  const queued = (await req.payload.jobs.queue({
    task,
    input: {},
    queue: 'manual',
  } as unknown as QueueArgs)) as unknown as { id: number | string }
  await req.payload.jobs.runByID({ id: queued.id, silent: true })
  const done = (await req.payload
    .findByID({ collection: 'payload-jobs', id: queued.id, depth: 0, overrideAccess: true })
    .catch(() => null)) as {
    hasError?: boolean | null
    log?: { output?: unknown; state?: string }[] | null
  } | null
  const entry = done?.log?.at(-1)
  const ok = Boolean(done) && !done?.hasError && entry?.state === 'succeeded'
  await audit(
    req.payload,
    {
      action: 'ops.job_run',
      area: 'operations',
      result: ok ? 'ok' : 'failed',
      stepUp: job.deletes,
      target: { type: 'job', id: String(task), label: String(task) },
      detail: { output: (entry?.output as Record<string, unknown> | undefined) ?? null },
    },
    req,
  )
  return json({ ok, output: entry?.output ?? null }, ok ? 200 : 500)
}

/**
 * The Control Center's operations actions (docs/CONTROL-CENTER.md §3.2):
 *   GET  /api/operations/logs?service=app&lines=200   operations.read (masked by the agent)
 *   POST /api/operations/certificates                 operations.read (check again now)
 *   POST /api/operations/refresh                      operations.read (collect now)
 *   POST /api/operations/restart  { service, confirm } operations.act + code + typed name
 *   POST /api/operations/backup                       operations.act + code
 *   POST /api/operations/drill                        operations.act + code
 *   POST /api/operations/jobs/run { task }            jobs.run (+ code for deleting jobs)
 * Every action is in the audit log; the agent checks its signature and its own limits again.
 */
export const operationsEndpoints: Endpoint[] = [
  { path: '/operations/logs', method: 'get', handler: logs },
  { path: '/operations/certificates', method: 'post', handler: certificates },
  { path: '/operations/refresh', method: 'post', handler: refresh },
  { path: '/operations/restart', method: 'post', handler: restart },
  { path: '/operations/backup', method: 'post', handler: startJob('backup') },
  { path: '/operations/drill', method: 'post', handler: startJob('drill') },
  { path: '/operations/jobs/run', method: 'post', handler: runJob },
]
