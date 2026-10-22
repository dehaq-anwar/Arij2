import { createServer, type ServerResponse } from 'node:http'

import { authenticate, NonceCache } from '../../ops-agent/src/auth.ts'

/**
 * A stand-in for the operations agent in the end-to-end tests (started by
 * scripts/e2e-server.mjs, run by Node directly). It checks every request's signature with the
 * agent's own code (ops-agent/src/auth.ts) and answers with fixed, plausible data, so the
 * operations screens can be tested and checked for accessibility without Docker or a backup
 * repository. Actions are accepted and recorded in its event list, like the real agent.
 * Nothing here reaches a real server; the real agent is tested in tests/unit and
 * tests/integration/backup-drill.test.ts.
 */
const secret = process.env.OPS_AGENT_SECRET ?? ''
const port = Number(process.env.FAKE_AGENT_PORT ?? 3199)
const nonces = new NonceCache()
const startedAt = new Date(Date.now() - 3 * 24 * 3600_000).toISOString()

const HOUR = 3600_000
const ago = (ms: number) => new Date(Date.now() - ms).toISOString()

type Event = {
  id: string
  kind: 'backup' | 'drill' | 'restart'
  trigger: 'schedule' | 'manual'
  startedAt: string
  finishedAt: string
  ok: boolean
  detail: Record<string, unknown>
}

const events: Event[] = [
  {
    id: 'e2e-backup-1',
    kind: 'backup',
    trigger: 'schedule',
    startedAt: ago(30 * HOUR),
    finishedAt: ago(30 * HOUR - 95_000),
    ok: false,
    detail: { error: 'restic: repository is locked (Fatal: unable to create lock)' },
  },
  {
    id: 'e2e-backup-2',
    kind: 'backup',
    trigger: 'schedule',
    startedAt: ago(6 * HOUR),
    finishedAt: ago(6 * HOUR - 161_000),
    ok: true,
    detail: {
      database: {
        snapshotId: 'a1b2c3d4e5f6',
        bytes: 43_120_000,
        tables: 64,
        rows: 1_840,
        seconds: 12,
      },
      media: { snapshotId: 'f6e5d4c3b2a1', files: 212, bytes: 327_000_000, seconds: 140 },
      retention: 'applied',
    },
  },
  {
    id: 'e2e-drill-1',
    kind: 'drill',
    trigger: 'schedule',
    startedAt: ago(4 * HOUR),
    finishedAt: ago(4 * HOUR - 98_000),
    ok: true,
    detail: {
      snapshotId: 'a1b2c3d4e5f6',
      tablesCompared: 64,
      rowsCompared: 1_840,
      tables: 64,
      triggers: 5,
      migration: '20261021_233818_cc3_operations',
      mediaFiles: 212,
      repositoryCheck: 'ok',
      problems: [],
    },
  },
]

const container = (service: string, extra: Record<string, unknown> = {}) => ({
  service,
  name: `yop-${service}-1`,
  state: 'running',
  status: 'Up 3 days (healthy)',
  health: 'healthy',
  startedAt,
  image: `yop-${service}:e2e@sha256:${'0'.repeat(64)}`,
  imageId: `sha256:${'1'.repeat(64)}`,
  restartCount: 0,
  ...extra,
})

/** Host samples every minute for the last three hours (what the real agent keeps). */
function samples(since: string | null) {
  const list = []
  const now = Math.floor(Date.now() / 60_000) * 60_000
  for (let i = 180; i >= 0; i--) {
    const at = new Date(now - i * 60_000).toISOString()
    if (since && at <= since) continue
    const wave = Math.sin(i / 9) * 6
    list.push({
      at,
      cpuPercent: Math.round((14 + wave + (i % 7)) * 10) / 10,
      memoryUsedBytes: 2_300_000_000 + Math.round(wave * 20_000_000),
      memoryTotalBytes: 4_000_000_000,
      load1: 0.4,
      diskUsedBytes: 31_000_000_000,
      diskTotalBytes: 80_000_000_000,
    })
  }
  return list
}

function status() {
  return {
    agent: {
      version: 'e2e',
      startedAt,
      tools: {
        restic: 'restic 0.19.1 compiled with go1.25 on linux/amd64',
        pgDump: 'pg_dump (PostgreSQL) 18.6',
        pgRestore: 'pg_restore (PostgreSQL) 18.6',
        rclone: 'rclone v1.75.1',
      },
      backup: {
        configured: true,
        media: 's3',
        schedule: { backup: '02:30', drillDay: 'sun', drill: '04:00' },
        timeZone: 'Europe/Berlin',
        keep: { daily: 7, weekly: 4, monthly: 6 },
        prune: true,
      },
      accessLog: true,
      certificateHosts: ['yop-ye.org', 'verwaltung.yop-ye.org'],
      services: ['caddy', 'app', 'postgres', 'ops-agent', 'socket-proxy'],
      restartable: ['app', 'caddy'],
    },
    docker: { reachable: true, error: null },
    containers: [
      container('caddy'),
      container('app', { restartCount: 1 }),
      container('postgres'),
      container('ops-agent', { health: null, status: 'Up 3 days' }),
      container('socket-proxy', { health: null, status: 'Up 3 days' }),
    ],
    running: null,
    lastBackup: events.filter((e) => e.kind === 'backup').at(-1) ?? null,
    lastDrill: events.filter((e) => e.kind === 'drill').at(-1) ?? null,
  }
}

const logLines = [
  '{"level":30,"time":1,"msg":"retention: expired submissions deleted","contactMessages":1,"rejectedApplications":0}',
  '{"level":30,"time":2,"msg":"Request refused","status":403}',
  '{"level":40,"time":3,"msg":"Notification e-mail failed","to":"i***@yop-ye.org","code":"ETIMEDOUT"}',
  '{"level":50,"time":4,"msg":"page render failed","path":"/en/news/x","status":500,"client":"203.0.113.x"}',
  '{"level":30,"time":5,"msg":"Notification e-mail sent","template":"newApplication"}',
]

/**
 * Counts for every complete hour of the last two days in the range: the same numbers every run
 * (the hour of the day decides them), so the statistics screen can be tested exactly.
 */
function accessHours(since: number, until: number) {
  const hours = []
  const earliest = Math.max(since, Date.now() - 48 * HOUR)
  for (let at = Math.ceil(earliest / HOUR) * HOUR; at < until; at += HOUR) {
    const h = new Date(at).getUTCHours()
    hours.push({
      hour: new Date(at).toISOString(),
      requests: 40,
      views: 10,
      entrances: 4,
      bots: 3,
      notFound: h === 9 ? 2 : 0,
      serverErrors: h === 9 ? 1 : 0,
      pages: [
        { path: '/', locale: 'de', views: 5, entrances: 2 },
        { path: '/en/projects', locale: 'en', views: 3, entrances: 1 },
        { path: '/ar', locale: 'ar', views: 2, entrances: 1 },
      ],
      referrers: [{ host: 'duckduckgo.com', entrances: 2 }],
      notFoundPaths: h === 9 ? [{ path: '/projekt-alt', count: 2 }] : [],
      errors: h === 9 ? [{ path: '/en/news/x', status: 500, count: 1 }] : [],
    })
  }
  return hours
}

function reply(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

createServer(async (req, res) => {
  let body = ''
  for await (const chunk of req) body += (chunk as Buffer).toString('utf8')
  const url = new URL(req.url ?? '/', 'http://agent')
  if (req.method === 'GET' && url.pathname === '/health') return reply(res, 200, { ok: true })
  const auth = authenticate(secret, nonces, {
    method: req.method ?? 'GET',
    path: req.url ?? '/',
    headers: req.headers,
    body,
  })
  if (!auth.ok) return reply(res, 401, { error: auth.reason })
  const route = `${req.method} ${url.pathname}`
  switch (route) {
    case 'GET /v1/status':
      return reply(res, 200, status())
    case 'GET /v1/metrics':
      return reply(res, 200, { samples: samples(url.searchParams.get('since')) })
    case 'GET /v1/events': {
      const since = url.searchParams.get('since')
      return reply(res, 200, {
        events: since ? events.filter((e) => e.finishedAt > since) : events,
      })
    }
    case 'GET /v1/backups':
      return reply(res, 200, {
        configured: true,
        error: null,
        snapshots: [
          {
            id: 'f6e5d4c3b2a1'.padEnd(64, '0'),
            shortId: 'f6e5d4c3',
            time: ago(6 * HOUR - 20_000),
            kind: 'media',
            files: 212,
            bytes: 327_000_000,
          },
          {
            id: 'a1b2c3d4e5f6'.padEnd(64, '0'),
            shortId: 'a1b2c3d4',
            time: ago(6 * HOUR),
            kind: 'db',
            files: 1,
            bytes: 43_120_000,
          },
        ],
      })
    case 'GET /v1/certificates':
      return reply(res, 200, {
        certificates: ['yop-ye.org', 'verwaltung.yop-ye.org'].map((host) => ({
          host,
          ok: true,
          validTo: new Date(Date.now() + 61 * 24 * HOUR).toISOString(),
          daysLeft: 61,
          issuer: "Let's Encrypt R11",
          trusted: true,
          error: null,
        })),
      })
    case 'GET /v1/logs': {
      const service = url.searchParams.get('service') ?? ''
      if (!status().agent.services.includes(service)) return reply(res, 400, { error: 'service' })
      const lines = logLines.map(
        (line, index) =>
          `${new Date(Date.now() - (logLines.length - index) * 60_000).toISOString()} ${line}`,
      )
      return reply(res, 200, { service, lines })
    }
    case 'GET /v1/access': {
      const since = new Date(url.searchParams.get('since') ?? '').getTime()
      const until = new Date(url.searchParams.get('until') ?? '').getTime()
      if (!(until > since)) return reply(res, 400, { error: 'range' })
      return reply(res, 200, { hours: accessHours(since, until) })
    }
    case 'POST /v1/restart': {
      const service = String((JSON.parse(body || '{}') as { service?: unknown }).service ?? '')
      if (!['app', 'caddy'].includes(service)) return reply(res, 403, { error: 'not_allowed' })
      // Recorded like the real agent, but nothing is restarted.
      events.push({
        id: `e2e-restart-${events.length}`,
        kind: 'restart',
        trigger: 'manual',
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        ok: true,
        detail: { service },
      })
      return reply(res, 202, { accepted: true, service })
    }
    case 'POST /v1/backup':
    case 'POST /v1/drill':
      return reply(res, 202, { accepted: true, kind: url.pathname.slice(4) })
    default:
      return reply(res, 404, { error: 'not_found' })
  }
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`[e2e] fake operations agent on 127.0.0.1:${port}\n`)
})
