import { MIN_SECRET_LENGTH, signedHeaders } from '@ops/protocol'

import type { HourStats } from '@ops/access-log'
import type { CertificateStatus } from '@ops/certs'
import type { ContainerStatus } from '@ops/docker'
import type { Sample } from '@ops/metrics'
import type { AgentEvent } from '@ops/state'

export type { AgentEvent, CertificateStatus, ContainerStatus, HourStats, Sample }

/**
 * The Control Center's side of the operations agent (docs/CONTROL-CENTER.md §3.1–3.2): every
 * request is signed with OPS_AGENT_SECRET (ops-agent/src/protocol.ts) and goes to the agent on
 * the internal network (OPS_AGENT_URL). The app never talks to Docker, the backup storage or the
 * host itself; without the two settings everything here reports "not set up".
 */
export type AgentSetup = { url: string; secret: string } | null

export function agentSetup(env: Record<string, string | undefined> = process.env): AgentSetup {
  const url = env.OPS_AGENT_URL?.trim()
  const secret = env.OPS_AGENT_SECRET ?? ''
  if (!url || secret.length < MIN_SECRET_LENGTH) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return { url: parsed.origin, secret }
  } catch {
    return null
  }
}

export type AgentStatus = {
  agent: {
    version: string
    startedAt: string
    tools: Record<string, string | null>
    backup: {
      configured: boolean
      media: 'none' | 'path' | 's3'
      schedule: { backup: string; drillDay: string; drill: string }
      timeZone: string
      keep: { daily: number; weekly: number; monthly: number }
      prune: boolean
    }
    accessLog: boolean
    certificateHosts: string[]
    /** The Compose services the agent watches; one without a container is missing. */
    services: string[]
    restartable: string[]
  }
  docker: { reachable: boolean; error: string | null }
  containers: ContainerStatus[]
  running: { kind: 'backup' | 'drill'; trigger: string; startedAt: string } | null
  lastBackup: AgentEvent | null
  lastDrill: AgentEvent | null
}

export type Snapshot = {
  id: string
  shortId: string
  time: string
  kind: 'db' | 'media'
  files: number | null
  bytes: number | null
}

/** What each read action answers (ops-agent/src/agent.ts). */
export type AgentReads = {
  '/v1/status': AgentStatus
  '/v1/metrics': { samples: Sample[] }
  '/v1/logs': { service: string; lines: string[] }
  '/v1/backups': { configured: boolean; snapshots: Snapshot[]; error: string | null }
  '/v1/events': { events: AgentEvent[] }
  '/v1/certificates': { certificates: CertificateStatus[] }
  '/v1/access': { hours: HourStats[] }
}

export type AgentAction = '/v1/restart' | '/v1/backup' | '/v1/drill'

export class AgentError extends Error {
  readonly reason: 'not_configured' | 'unreachable' | 'refused'
  readonly status: number
  readonly code: string | null

  constructor(reason: AgentError['reason'], status = 0, code: string | null = null) {
    super(`operations agent: ${reason}${code ? ` (${code})` : ''}`)
    this.reason = reason
    this.status = status
    this.code = code
  }
}

async function call<T>(
  setup: AgentSetup,
  method: 'GET' | 'POST',
  path: string,
  body: string,
  timeoutMs: number,
): Promise<T> {
  if (!setup) throw new AgentError('not_configured')
  let response: Response
  try {
    response = await fetch(`${setup.url}${path}`, {
      method,
      headers: {
        ...signedHeaders(setup.secret, method, path, body),
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body || undefined,
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    })
  } catch {
    throw new AgentError('unreachable')
  }
  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null
  if (!response.ok || !data) {
    throw new AgentError('refused', response.status, data?.error ?? null)
  }
  return data
}

/** A read action; `query` is appended in a fixed order, so the signed path is the sent path. */
export function agentRead<P extends keyof AgentReads>(
  path: P,
  query: Record<string, string | number | null | undefined> = {},
  { setup = agentSetup(), timeoutMs = 15_000 }: { setup?: AgentSetup; timeoutMs?: number } = {},
): Promise<AgentReads[P]> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== '') params.set(key, String(value))
  }
  const search = params.toString()
  return call<AgentReads[P]>(setup, 'GET', search ? `${path}?${search}` : path, '', timeoutMs)
}

export function agentAct(
  path: AgentAction,
  body: Record<string, unknown> = {},
  { setup = agentSetup(), timeoutMs = 15_000 }: { setup?: AgentSetup; timeoutMs?: number } = {},
): Promise<{ accepted: boolean }> {
  return call(setup, 'POST', path, JSON.stringify(body), timeoutMs)
}
