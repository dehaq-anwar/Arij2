import { access } from 'node:fs/promises'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'

import { aggregateAccessLogs } from './access-log.ts'
import { authenticate, NonceCache, RateLimiter } from './auth.ts'
import { listSnapshots, runBackup } from './backup.ts'
import { checkCertificate } from './certs.ts'
import { backupConfigured, type AgentConfig, type Restartable } from './config.ts'
import { DockerClient } from './docker.ts'
import { runDrill } from './drill.ts'
import { maskLine } from './mask.ts'
import type { Sampler } from './metrics.ts'
import { run } from './run.ts'
import type { AgentEvent, StateStore } from './state.ts'

/**
 * The agent's complete list of actions (docs/CONTROL-CENTER.md §3.2). Everything else answers
 * 404. Read actions need `operations.read` in the Control Center, the others `operations.act`
 * and a fresh code there; the agent itself only trusts the signature.
 */
export const ACTIONS = [
  'GET /v1/status',
  'GET /v1/metrics',
  'GET /v1/logs',
  'GET /v1/backups',
  'GET /v1/events',
  'GET /v1/certificates',
  'GET /v1/access',
  'POST /v1/restart',
  'POST /v1/backup',
  'POST /v1/drill',
] as const

const MAX_BODY = 16 * 1024
const MAX_LOG_LINES = 500

export type AgentDeps = {
  config: AgentConfig
  state: StateStore
  sampler: Sampler
  docker?: DockerClient
  now?: () => Date
}

type Job = { kind: 'backup' | 'drill'; trigger: AgentEvent['trigger']; startedAt: string }

export class Agent {
  readonly startedAt = new Date().toISOString()
  private readonly nonces = new NonceCache()
  private readonly restarts = new RateLimiter(3, 15 * 60_000)
  private readonly manualJobs = new RateLimiter(4, 60 * 60_000)
  private readonly docker: DockerClient
  private job: Job | null = null
  private jobDone: Promise<AgentEvent | null> = Promise.resolve(null)
  private tools: Record<string, string | null> | null = null

  private readonly deps: AgentDeps

  constructor(deps: AgentDeps) {
    this.deps = deps
    this.docker = deps.docker ?? new DockerClient(deps.config.dockerUrl)
  }

  private now() {
    return this.deps.now?.() ?? new Date()
  }

  /** Starts a backup or drill unless one is running (one at a time). */
  startJob(kind: Job['kind'], trigger: Job['trigger']): boolean {
    if (this.job) return false
    const job: Job = { kind, trigger, startedAt: this.now().toISOString() }
    this.job = job
    const { config, state } = this.deps
    this.jobDone = (
      kind === 'backup' ? runBackup(config, state, trigger) : runDrill(config, state, trigger)
    )
      .then((event) => {
        log({ action: kind, trigger, ok: event.ok })
        return event
      })
      .finally(() => {
        this.job = null
      })
    return true
  }

  /** For tests and the command line: waits for the running job. */
  waitForJob() {
    return this.jobDone
  }

  async toolVersions(): Promise<Record<string, string | null>> {
    if (this.tools) return this.tools
    const { bin } = this.deps.config
    const version = async (command: string, args: string[]) => {
      try {
        const result = await run(command, args, { timeoutMs: 10_000 })
        return result.code === 0 ? (result.stdout.split('\n')[0] ?? '').slice(0, 80) : null
      } catch {
        return null
      }
    }
    this.tools = {
      restic: await version(bin.restic, ['version']),
      pgDump: await version(bin.pgDump, ['--version']),
      pgRestore: await version(bin.pgRestore, ['--version']),
      rclone: await version(bin.rclone, ['version']),
    }
    return this.tools
  }

  private async status() {
    const { config, state } = this.deps
    const reachable = await this.docker.ping()
    let containers: Awaited<ReturnType<DockerClient['containers']>> = []
    let dockerError: string | null = null
    if (reachable) {
      try {
        containers = await this.docker.containers(config.composeProject, config.services)
      } catch (error) {
        dockerError = String((error as Error).message)
      }
    }
    const accessLog = await access(config.accessLogDir).then(
      () => true,
      () => false,
    )
    return {
      agent: {
        version: config.version,
        startedAt: this.startedAt,
        tools: await this.toolVersions(),
        backup: {
          configured: backupConfigured(config),
          media: config.backup.media,
          schedule: {
            backup: config.backup.time,
            drillDay: config.backup.drillDay,
            drill: config.backup.drillTime,
          },
          timeZone: config.timeZone,
          keep: config.backup.keep,
          prune: config.backup.prune,
        },
        accessLog,
        certificateHosts: config.certificates.hosts,
        services: config.services,
        restartable: config.restartable,
      },
      docker: { reachable, error: dockerError },
      containers,
      running: this.job,
      lastBackup: state.last('backup') ?? null,
      lastDrill: state.last('drill') ?? null,
    }
  }

  async handle(method: string, url: URL, body: string): Promise<{ status: number; json: unknown }> {
    const { config, state, sampler } = this.deps
    const route = `${method} ${url.pathname}`
    switch (route) {
      case 'GET /v1/status':
        return { status: 200, json: await this.status() }
      case 'GET /v1/metrics':
        return { status: 200, json: { samples: sampler.since(url.searchParams.get('since')) } }
      case 'GET /v1/logs': {
        const service = url.searchParams.get('service') ?? ''
        if (!config.services.includes(service)) return { status: 400, json: { error: 'service' } }
        const lines = Math.min(
          MAX_LOG_LINES,
          Math.max(1, Number(url.searchParams.get('lines')) || 200),
        )
        const raw = await this.docker.logs(config.composeProject, service, lines)
        return { status: 200, json: { service, lines: raw.map(maskLine) } }
      }
      case 'GET /v1/backups': {
        let snapshots: Awaited<ReturnType<typeof listSnapshots>> = []
        let error: string | null = null
        try {
          snapshots = await listSnapshots(config)
        } catch (e) {
          error = maskLine(String((e as Error).message)).slice(0, 300)
        }
        return { status: 200, json: { configured: backupConfigured(config), snapshots, error } }
      }
      case 'GET /v1/events':
        return { status: 200, json: { events: state.events(url.searchParams.get('since')) } }
      case 'GET /v1/certificates': {
        const results = await Promise.all(
          config.certificates.hosts.map((host) =>
            checkCertificate(host, config.certificates.connect),
          ),
        )
        return { status: 200, json: { certificates: results } }
      }
      case 'GET /v1/access': {
        const since = new Date(url.searchParams.get('since') ?? '')
        const until = new Date(url.searchParams.get('until') ?? '')
        if (Number.isNaN(since.getTime()) || Number.isNaN(until.getTime()) || until <= since) {
          return { status: 400, json: { error: 'range' } }
        }
        // At most 8 days per request (raw logs are kept 7).
        if (until.getTime() - since.getTime() > 8 * 24 * 3600_000)
          return { status: 400, json: { error: 'range' } }
        const hosts = [config.siteHost, ...config.certificates.hosts].filter(Boolean)
        const hours = await aggregateAccessLogs(
          config.accessLogDir,
          config.accessLogPrefix,
          since,
          until,
          hosts,
        )
        return { status: 200, json: { hours } }
      }
      case 'POST /v1/restart': {
        let service = ''
        try {
          service = String((JSON.parse(body || '{}') as { service?: unknown }).service ?? '')
        } catch {
          return { status: 400, json: { error: 'body' } }
        }
        if (!config.restartable.includes(service as Restartable))
          return { status: 403, json: { error: 'not_allowed' } }
        if (!this.restarts.allow(service)) return { status: 429, json: { error: 'too_many' } }
        const startedAt = this.now().toISOString()
        // Answer first: restarting the app ends the connection that asked for it.
        setTimeout(() => {
          this.docker
            .restart(config.composeProject, service)
            .then(
              () => ({ ok: true, detail: { service } }),
              (error: Error) => ({
                ok: false,
                detail: { service, error: maskLine(error.message) },
              }),
            )
            .then(({ ok, detail }) =>
              state.record({
                kind: 'restart',
                trigger: 'manual',
                startedAt,
                finishedAt: new Date().toISOString(),
                ok,
                detail,
              }),
            )
            .then((event) => log({ action: 'restart', service, ok: event.ok }))
            .catch(() => undefined)
        }, 200)
        return { status: 202, json: { accepted: true, service } }
      }
      case 'POST /v1/backup':
      case 'POST /v1/drill': {
        const kind = route.endsWith('backup') ? 'backup' : 'drill'
        if (!backupConfigured(config)) return { status: 409, json: { error: 'not_configured' } }
        if (this.job) return { status: 409, json: { error: 'busy', running: this.job } }
        if (!this.manualJobs.allow('jobs')) return { status: 429, json: { error: 'too_many' } }
        this.startJob(kind, 'manual')
        return { status: 202, json: { accepted: true, kind } }
      }
      default:
        return { status: 404, json: { error: 'not_found' } }
    }
  }

  async serve(req: IncomingMessage, res: ServerResponse) {
    const started = Date.now()
    const url = new URL(req.url ?? '/', 'http://agent')
    const reply = (status: number, json: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      res.end(JSON.stringify(json))
      log({ method: req.method, path: url.pathname, status, ms: Date.now() - started })
    }
    if (req.method === 'GET' && url.pathname === '/health') return reply(200, { ok: true })
    let body = ''
    let size = 0
    for await (const chunk of req) {
      size += (chunk as Buffer).length
      if (size > MAX_BODY) return reply(413, { error: 'too_large' })
      body += (chunk as Buffer).toString('utf8')
    }
    const auth = authenticate(this.deps.config.secret, this.nonces, {
      method: req.method ?? 'GET',
      path: req.url ?? '/',
      headers: req.headers,
      body,
    })
    if (!auth.ok) return reply(401, { error: auth.reason })
    try {
      const { status, json } = await this.handle(req.method ?? 'GET', url, body)
      return reply(status, json)
    } catch (error) {
      return reply(502, {
        error: 'failed',
        message: maskLine(String((error as Error).message)).slice(0, 300),
      })
    }
  }

  listen(): Promise<Server> {
    const server = createServer((req, res) => void this.serve(req, res))
    // Slow or idle clients cannot hold the agent.
    server.requestTimeout = 30_000
    server.headersTimeout = 10_000
    return new Promise((resolve) =>
      server.listen(this.deps.config.port, this.deps.config.host, () => resolve(server)),
    )
  }
}

export function log(fields: Record<string, unknown>) {
  if (process.env.VITEST) return
  process.stdout.write(`${JSON.stringify({ at: new Date().toISOString(), ...fields })}\n`)
}
