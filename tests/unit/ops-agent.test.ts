import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import os from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  aggregateAccessLogs,
  Aggregator,
  localeOf,
  normalisePath,
  referrerHost,
} from '@ops/access-log'
import { Agent } from '@ops/agent'
import { authenticate, NonceCache, RateLimiter } from '@ops/auth'
import { parseStats, snapshotOf } from '@ops/backup'
import { loadConfig } from '@ops/config'
import { demultiplex } from '@ops/docker'
import { compareWithBackup, PROTECTIONS } from '@ops/drill'
import { maskLine } from '@ops/mask'
import { cpuPercent, parseCpu, parseMemory, Sampler } from '@ops/metrics'
import { signedHeaders } from '@ops/protocol'
import { localTime, Scheduler } from '@ops/scheduler'
import { StateStore } from '@ops/state'

const SECRET = 'x'.repeat(48)

describe('the agent’s code', () => {
  it('runs with Node’s own TypeScript support, as in its image (no build step)', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "await import('./ops-agent/src/agent.ts'); await import('./ops-agent/src/cli.ts')",
      ],
      { encoding: 'utf8' },
    )
    expect(result.stderr).toContain('usage: node src/cli.ts')
    expect(result.status).toBe(2)
  })
})

describe('signed requests', () => {
  const request = (headers: Record<string, string>, body = '{"service":"app"}') => ({
    method: 'POST',
    path: '/v1/restart',
    headers,
    body,
  })

  it('accepts a fresh, correctly signed request once', () => {
    const nonces = new NonceCache()
    const now = Date.now()
    const headers = signedHeaders(SECRET, 'POST', '/v1/restart', '{"service":"app"}', now)
    expect(authenticate(SECRET, nonces, request(headers), now)).toEqual({ ok: true })
    // The same request again is a replay.
    expect(authenticate(SECRET, nonces, request(headers), now)).toEqual({
      ok: false,
      reason: 'replay',
    })
  })

  it('refuses changed bodies, paths, methods, wrong secrets, old and future timestamps', () => {
    const now = Date.now()
    const check = (
      headers: Record<string, string>,
      over: Partial<ReturnType<typeof request>> = {},
    ) => authenticate(SECRET, new NonceCache(), { ...request(headers), ...over }, now)
    const good = () => signedHeaders(SECRET, 'POST', '/v1/restart', '{"service":"app"}', now)
    expect(check(good(), { body: '{"service":"caddy"}' })).toMatchObject({ reason: 'signature' })
    expect(check(good(), { path: '/v1/backup' })).toMatchObject({ reason: 'signature' })
    expect(check(good(), { method: 'GET' })).toMatchObject({ reason: 'signature' })
    expect(
      check(signedHeaders('y'.repeat(48), 'POST', '/v1/restart', '{"service":"app"}', now)),
    ).toMatchObject({ reason: 'signature' })
    expect(
      check(signedHeaders(SECRET, 'POST', '/v1/restart', '{"service":"app"}', now - 61_000)),
    ).toMatchObject({ reason: 'expired' })
    expect(
      check(signedHeaders(SECRET, 'POST', '/v1/restart', '{"service":"app"}', now + 61_000)),
    ).toMatchObject({ reason: 'expired' })
    expect(check({})).toMatchObject({ reason: 'unsigned' })
    expect(check({ ...good(), 'x-ops-nonce': 'not-a-uuid' })).toMatchObject({ reason: 'malformed' })
    expect(check({ ...good(), 'x-ops-signature': 'abc' })).toMatchObject({ reason: 'signature' })
  })

  it('an unsigned request with a stolen one-time value cannot block the real one', () => {
    const nonces = new NonceCache()
    const now = Date.now()
    const headers = signedHeaders(SECRET, 'POST', '/v1/restart', '{"service":"app"}', now)
    authenticate(SECRET, nonces, request({ ...headers, 'x-ops-signature': '0'.repeat(64) }), now)
    expect(authenticate(SECRET, nonces, request(headers), now)).toEqual({ ok: true })
  })

  it('limits actions per key and window', () => {
    const limiter = new RateLimiter(3, 1000)
    expect([1, 2, 3, 4].map(() => limiter.allow('app', 0))).toEqual([true, true, true, false])
    expect(limiter.allow('caddy', 0)).toBe(true)
    expect(limiter.allow('app', 1001)).toBe(true)
  })

  it('needs a long secret and never widens the services that may be restarted', () => {
    expect(() => loadConfig({ OPS_AGENT_SECRET: 'short' })).toThrow(/at least 32/)
    const config = loadConfig({
      OPS_AGENT_SECRET: SECRET,
      RESTARTABLE_SERVICES: 'app,postgres,caddy',
    })
    expect(config.restartable).toEqual(['app', 'caddy'])
    expect(
      loadConfig({ OPS_AGENT_SECRET: SECRET, RESTARTABLE_SERVICES: 'caddy' }).restartable,
    ).toEqual(['caddy'])
    expect(
      loadConfig({ OPS_AGENT_SECRET: SECRET, DRILL_DATABASE: 'x; drop' }).backup.drillDatabase,
    ).toBe('restore_drill')
  })
})

describe('masked logs', () => {
  it('hides personal data and secrets', () => {
    const line = maskLine(
      'user anna.beispiel@example.org from 203.0.113.42 / 2001:db8:1:2:3:4:5:6 ' +
        'Authorization: Bearer abcdefghijklmnopqrstuv ' +
        'token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c ' +
        'postgres://yop:supersecret@postgres:5432/yop password: "hunter2hunter2" ' +
        'cookie=payload-token=abc123; key 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08 ' +
        'apiKey=Xy7Pq2Lm9Kt4Rz8Vb3Nw6Cs1Df5Gh0Jk',
    )
    expect(line).toContain('a***@example.org')
    expect(line).not.toContain('anna.beispiel')
    expect(line).toContain('203.0.113.x')
    expect(line).not.toContain('203.0.113.42')
    expect(line).toContain('2001:db8:1:x')
    expect(line).toContain('Bearer [hidden]')
    expect(line).not.toContain('eyJhbGciOiJIUzI1NiJ9')
    expect(line).toContain('postgres://yop:[hidden]@postgres')
    expect(line).not.toContain('supersecret')
    expect(line).not.toContain('hunter2')
    expect(line).not.toContain('abc123')
    expect(line).not.toContain('9f86d081884c')
    expect(line).not.toContain('Xy7Pq2Lm9Kt4')
  })

  it('keeps what is needed to understand a log line', () => {
    const line =
      '2026-10-21T12:34:56.789Z {"level":30,"statusCode":404,"path":"/admin/collections/membership-applications/123","msg":"Request refused"}'
    expect(maskLine(line)).toBe(line)
    expect(
      maskLine('GET /projekte/e2e-ein-sehr-langer-projekt-slug-mit-vielen-woertern 200'),
    ).toContain('e2e-ein-sehr-langer-projekt-slug-mit-vielen-woertern')
    expect(maskLine('\u001b[31merror\u001b[0m')).toBe('error')
    expect(maskLine('x'.repeat(5000)).length).toBeLessThan(2100)
  })
})

describe('docker and host values', () => {
  it('splits framed container output', () => {
    const frame = (stream: number, text: string) => {
      const payload = Buffer.from(text)
      const head = Buffer.alloc(8)
      head[0] = stream
      head.writeUInt32BE(payload.length, 4)
      return Buffer.concat([head, payload])
    }
    expect(demultiplex(Buffer.concat([frame(1, 'one\n'), frame(2, 'two\n')]))).toBe('one\ntwo\n')
    expect(demultiplex(Buffer.from('plain text\n'))).toBe('plain text\n')
  })

  it('reads CPU, memory and disk', async () => {
    const before = parseCpu('cpu  100 0 100 700 100 0 0 0 0 0\ncpu0 1 1 1 1')
    const after = parseCpu('cpu  150 0 150 750 150 0 0 0 0 0')
    expect(cpuPercent(before, after)).toBe(50)
    expect(cpuPercent(null, after)).toBeNull()
    expect(
      parseMemory('MemTotal:       2048 kB\nMemFree: 1 kB\nMemAvailable:    512 kB\n'),
    ).toEqual({
      used: 1536 * 1024,
      total: 2048 * 1024,
    })
    const sampler = new Sampler(os.tmpdir())
    const first = await sampler.sample(new Date('2026-10-21T10:00:00Z'))
    const second = await sampler.sample(new Date('2026-10-21T10:01:00Z'))
    expect(first.cpuPercent).toBeNull()
    expect(second.memoryTotalBytes).toBeGreaterThan(0)
    expect(second.diskTotalBytes).toBeGreaterThan(0)
    expect(sampler.since('2026-10-21T10:00:00.000Z')).toEqual([second])
  })
})

describe('visitor statistics from the access log', () => {
  const entry = (
    uri: string,
    extra: Record<string, unknown> = {},
    headers: Record<string, string> = {},
  ) => ({
    ts: Date.parse('2026-10-21T10:15:00Z') / 1000,
    status: 200,
    request: {
      method: 'GET',
      host: 'yop-ye.org',
      uri,
      headers: Object.fromEntries(
        Object.entries({ 'User-Agent': 'Mozilla/5.0 Firefox/140.0', ...headers }).map(([k, v]) => [
          k,
          [v],
        ]),
      ),
    },
    ...extra,
  })

  it('counts views and visits, not prefetches, bots, assets or the admin', () => {
    const a = new Aggregator(['yop-ye.org', 'verwaltung.yop-ye.org'])
    a.add(entry('/', {}, { Referer: 'https://www.google.com/search?q=x' }))
    a.add(entry('/projekte/', {}, { Referer: 'https://yop-ye.org/' }))
    a.add(entry('/en/about?utm=1'))
    a.add(entry('/ar/projects', {}, { RSC: '1' }))
    a.add(entry('/aktuelles', {}, { 'Next-Router-Prefetch': '1' }))
    a.add(entry('/', {}, { 'User-Agent': 'Googlebot/2.1' }))
    a.add(entry('/_next/static/chunks/main.js'))
    a.add(entry('/api/media/file/bild.webp'))
    a.add(entry('/admin'))
    a.add(entry('/logo.png'))
    a.add(entry('/gibt-es-nicht', { status: 404 }))
    a.add(entry('/_next/static/old.js', { status: 404 }))
    a.add(entry('/kontakt', { status: 500 }, {}))
    a.add({
      ...entry('/kontakt'),
      request: { ...entry('/kontakt').request, method: 'POST' },
      status: 502,
    })
    const [hour] = a.result()
    expect(hour).toMatchObject({
      hour: '2026-10-21T10:00:00.000Z',
      requests: 14,
      views: 4,
      entrances: 2,
      bots: 1,
      notFound: 1,
      serverErrors: 2,
    })
    expect(hour!.pages.map((p) => [p.path, p.locale, p.views, p.entrances])).toEqual(
      expect.arrayContaining([
        ['/', 'de', 1, 1],
        ['/projekte', 'de', 1, 0],
        ['/en/about', 'en', 1, 1],
        ['/ar/projects', 'ar', 1, 0],
      ]),
    )
    expect(hour!.referrers).toEqual([{ host: 'google.com', entrances: 1 }])
    expect(hour!.notFoundPaths).toEqual([{ path: '/gibt-es-nicht', count: 1 }])
    expect(hour!.errors).toEqual(
      expect.arrayContaining([
        { path: '/kontakt', status: 500, count: 1 },
        { path: '/kontakt', status: 502, count: 1 },
      ]),
    )
    // Nothing that identifies a person is part of the result.
    expect(JSON.stringify(hour)).not.toMatch(/Firefox|Googlebot|search\?q/)
  })

  it('normalises paths, languages and referrers', () => {
    expect(normalisePath('/projekte/?x=1#top')).toBe('/projekte')
    expect(normalisePath('/%C3%BCber')).toBe('/über')
    expect(localeOf('/ar/about')).toBe('ar')
    expect(localeOf('/arbeit')).toBe('de')
    expect(referrerHost('https://www.yop-ye.org/x', ['yop-ye.org'])).toBeNull()
    expect(referrerHost('not a url', [])).toBeNull()
    expect(referrerHost('https://t.co/abc', ['yop-ye.org'])).toBe('t.co')
  })

  it('reads the current and rolled log files for a time range', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'yop-access-'))
    const line = (iso: string, uri: string) =>
      JSON.stringify({
        ts: Date.parse(iso) / 1000,
        status: 200,
        request: { method: 'GET', uri, headers: { 'User-Agent': ['Mozilla/5.0'] } },
      })
    writeFileSync(
      path.join(dir, 'access-2026-10-20T00-00-00.000.log'),
      [
        line('2026-10-20T23:30:00Z', '/'),
        'not json',
        line('2026-10-21T00:10:00Z', '/kontakt'),
      ].join('\n'),
    )
    writeFileSync(path.join(dir, 'access.log'), line('2026-10-21T01:05:00Z', '/') + '\n')
    writeFileSync(path.join(dir, 'admin-access.log'), line('2026-10-21T00:20:00Z', '/admin') + '\n')
    const hours = await aggregateAccessLogs(
      dir,
      'access',
      new Date('2026-10-21T00:00:00Z'),
      new Date('2026-10-21T02:00:00Z'),
      ['yop-ye.org'],
    )
    expect(hours.map((h) => [h.hour, h.views])).toEqual([
      ['2026-10-21T00:00:00.000Z', 1],
      ['2026-10-21T01:00:00.000Z', 1],
    ])
    expect(
      await aggregateAccessLogs(path.join(dir, 'missing'), 'access', new Date(0), new Date(), []),
    ).toEqual([])
  })
})

describe('schedule', () => {
  it('uses the association’s time zone in summer and winter', () => {
    expect(localTime(new Date('2026-07-01T00:30:00Z'), 'Europe/Berlin')).toEqual({
      date: '2026-07-01',
      weekday: 3,
      time: '02:30',
    })
    expect(localTime(new Date('2026-12-06T01:30:00Z'), 'Europe/Berlin')).toEqual({
      date: '2026-12-06',
      weekday: 0,
      time: '02:30',
    })
  })

  it('runs a task once on its minute, not right after a start', () => {
    const run = async () => undefined
    const scheduler = new Scheduler(
      [
        { name: 'backup', weekday: null, time: '02:30', run },
        { name: 'drill', weekday: 0, time: '04:00', run },
      ],
      'Europe/Berlin',
      new Date('2026-12-05T00:00:00Z'),
    )
    expect(scheduler.due(new Date('2026-12-06T01:30:10Z')).map((t) => t.name)).toEqual(['backup'])
    expect(scheduler.due(new Date('2026-12-06T01:30:40Z'))).toEqual([])
    expect(scheduler.due(new Date('2026-12-06T03:00:05Z')).map((t) => t.name)).toEqual(['drill'])
    // Monday: no drill.
    expect(scheduler.due(new Date('2026-12-07T03:00:05Z'))).toEqual([])
    const fresh = new Scheduler(
      [{ name: 'backup', weekday: null, time: '02:30', run }],
      'Europe/Berlin',
      new Date('2026-12-06T01:30:00Z'),
    )
    expect(fresh.due(new Date('2026-12-06T01:30:20Z'))).toEqual([])
  })
})

describe('backups and restore drills', () => {
  it('reads database statistics and restic summaries', () => {
    expect(
      parseStats([
        'table|users|3',
        'table|audit_log|120',
        'trigger|users_keep_super_admin',
        'trigger|audit_log_no_truncate',
        'migration|20261021_141353_cc2_publishing',
      ]),
    ).toEqual({
      tables: { users: 3, audit_log: 120 },
      triggers: ['audit_log_no_truncate', 'users_keep_super_admin'],
      migration: '20261021_141353_cc2_publishing',
    })
    expect(
      snapshotOf(
        '{"message_type":"status"}\n{"message_type":"summary","snapshot_id":"abc123","total_files_processed":1,"total_bytes_processed":2048}\n',
      ),
    ).toEqual({ id: 'abc123', files: 1, bytes: 2048 })
    expect(snapshotOf('nothing')).toBeNull()
  })

  it('compares a restored database with what the backup recorded', () => {
    const meta = {
      tables: { users: 3, audit_log: 120, pages: 5 },
      triggers: [...PROTECTIONS],
      migration: 'm2',
    }
    expect(compareWithBackup(meta, { ...meta, tables: { ...meta.tables } })).toEqual({
      problems: [],
      tablesCompared: 3,
      rowsCompared: 128,
    })
    const broken = compareWithBackup(meta, {
      tables: { users: 3, audit_log: 119, extra: 1 },
      triggers: PROTECTIONS.filter((t) => t !== 'users_keep_super_admin'),
      migration: 'm1',
    })
    expect(broken.problems).toEqual([
      'rows in audit_log: 119 instead of 120',
      'table missing: pages',
      'unexpected table: extra',
      'trigger missing: users_keep_super_admin',
      'newest migration: m1 instead of m2',
    ])
  })
})

describe('the agent over HTTP', () => {
  let docker: Server
  const restarted: string[] = []
  let agentServer: Server
  let agent: Agent
  let base = ''

  beforeAll(async () => {
    // A stand-in for docker-socket-proxy with two containers of the project.
    const containers = [
      {
        Id: 'a1',
        Names: ['/yop-app-1'],
        Image: 'yop-website:1',
        ImageID: 'sha256:1',
        State: 'running',
        Status: 'Up 1 hour',
        Labels: { 'com.docker.compose.project': 'yop', 'com.docker.compose.service': 'app' },
      },
      {
        Id: 'p1',
        Names: ['/yop-postgres-1'],
        Image: 'postgres:18.6',
        ImageID: 'sha256:2',
        State: 'running',
        Status: 'Up 1 hour (healthy)',
        Labels: { 'com.docker.compose.project': 'yop', 'com.docker.compose.service': 'postgres' },
      },
    ]
    docker = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://docker')
      if (url.pathname === '/_ping') return res.end('OK')
      if (url.pathname === '/containers/json') {
        const filter = JSON.parse(url.searchParams.get('filters') ?? '{}') as { label?: string[] }
        const service = filter.label
          ?.find((l) => l.startsWith('com.docker.compose.service='))
          ?.split('=')[1]
        res.setHeader('content-type', 'application/json')
        return res.end(
          JSON.stringify(
            containers.filter(
              (c) => !service || c.Labels['com.docker.compose.service'] === service,
            ),
          ),
        )
      }
      const logs = url.pathname.match(/^\/containers\/(\w+)\/logs$/)
      if (logs) return res.end('2026-10-21T10:00:00Z login anna@example.org from 198.51.100.7\n')
      const restart = url.pathname.match(/^\/containers\/(\w+)\/restart$/)
      if (restart && req.method === 'POST') {
        restarted.push(restart[1]!)
        res.statusCode = 204
        return res.end()
      }
      if (url.pathname.match(/^\/containers\/\w+\/json$/)) {
        return res.end(
          JSON.stringify({
            State: { StartedAt: '2026-10-21T09:00:00Z', Health: { Status: 'healthy' } },
            RestartCount: 0,
          }),
        )
      }
      res.statusCode = 404
      res.end()
    })
    await new Promise<void>((resolve) => docker.listen(0, '127.0.0.1', resolve))
    const dir = mkdtempSync(path.join(os.tmpdir(), 'yop-agent-'))
    const config = loadConfig({
      OPS_AGENT_SECRET: SECRET,
      PORT: '0',
      HOST: '127.0.0.1',
      DOCKER_URL: `http://127.0.0.1:${(docker.address() as AddressInfo).port}`,
      STATE_DIR: dir,
      COMPOSE_PROJECT: 'yop',
      ACCESS_LOG_DIR: path.join(dir, 'logs'),
    })
    config.port = 0
    const state = new StateStore(path.join(dir, 'state.json'))
    agent = new Agent({ config, state, sampler: new Sampler(dir) })
    agentServer = await agent.listen()
    base = `http://127.0.0.1:${(agentServer.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise((resolve) => agentServer.close(resolve))
    await new Promise((resolve) => docker.close(resolve))
  })

  const call = async (method: string, pathWithQuery: string, body = '', secret = SECRET) => {
    const response = await fetch(`${base}${pathWithQuery}`, {
      method,
      body: method === 'GET' ? undefined : body,
      headers: {
        'content-type': 'application/json',
        ...signedHeaders(secret, method, pathWithQuery, body),
      },
    })
    return { status: response.status, json: (await response.json()) as Record<string, unknown> }
  }

  it('answers only signed requests; its health check says nothing else', async () => {
    expect((await fetch(`${base}/v1/status`)).status).toBe(401)
    expect((await call('GET', '/v1/status', '', 'z'.repeat(48))).status).toBe(401)
    expect(await (await fetch(`${base}/health`)).json()).toEqual({ ok: true })
    expect((await call('GET', '/v1/shell?cmd=id')).status).toBe(404)
    expect((await call('DELETE', '/v1/backups')).status).toBe(404)
  })

  it('reports the project’s services', async () => {
    const { status, json } = await call('GET', '/v1/status')
    expect(status).toBe(200)
    expect(
      (json.containers as { service: string; health: string }[]).map((c) => [c.service, c.health]),
    ).toEqual([
      ['app', 'healthy'],
      ['postgres', 'healthy'],
    ])
    expect(json.docker).toEqual({ reachable: true, error: null })
    expect((json.agent as { backup: { configured: boolean } }).backup.configured).toBe(false)
  })

  it('returns masked logs of listed services only', async () => {
    const { json } = await call('GET', '/v1/logs?service=app&lines=50')
    expect(json.lines).toEqual(['2026-10-21T10:00:00Z login a***@example.org from 198.51.100.x'])
    expect((await call('GET', '/v1/logs?service=../../etc')).status).toBe(400)
  })

  it('restarts the app or Caddy only, three times per quarter hour', async () => {
    expect((await call('POST', '/v1/restart', '{"service":"postgres"}')).status).toBe(403)
    expect((await call('POST', '/v1/restart', '{"service":"socket-proxy"}')).status).toBe(403)
    expect((await call('POST', '/v1/restart', 'not json')).status).toBe(400)
    for (let i = 0; i < 3; i++)
      expect((await call('POST', '/v1/restart', '{"service":"app"}')).status).toBe(202)
    expect((await call('POST', '/v1/restart', '{"service":"app"}')).status).toBe(429)
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(restarted).toEqual(['a1', 'a1', 'a1'])
    const { json } = await call('GET', '/v1/events')
    expect(
      (json.events as { kind: string; ok: boolean }[]).filter((e) => e.kind === 'restart'),
    ).toHaveLength(3)
  })

  it('refuses backups until they are configured', async () => {
    expect((await call('POST', '/v1/backup')).json).toEqual({ error: 'not_configured' })
    expect((await call('GET', '/v1/backups')).json).toMatchObject({
      configured: false,
      snapshots: [],
    })
  })

  it('checks ranges for visitor statistics', async () => {
    expect((await call('GET', '/v1/access?since=x&until=y')).status).toBe(400)
    expect(
      (await call('GET', '/v1/access?since=2026-10-01T00:00:00Z&until=2026-10-21T00:00:00Z'))
        .status,
    ).toBe(400)
    expect(
      (await call('GET', '/v1/access?since=2026-10-20T00:00:00Z&until=2026-10-21T00:00:00Z')).json,
    ).toEqual({
      hours: [],
    })
  })
})
