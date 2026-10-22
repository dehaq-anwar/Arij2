import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { authenticate, NonceCache } from '@ops/auth'
import { parseLine } from '@/cms/admin/operations/log-line'
import { resolveMailSettings } from '@/cms/mail/settings'
import { maskRecipients } from '@/cms/mail/log'
import { newSubmissionMail, passwordResetMail } from '@/cms/mail/templates'
import { agentAct, agentRead, AgentError, agentSetup } from '@/cms/operations/agent'
import { operationsAlerts, type AlertInput } from '@/cms/operations/alerts'
import { MANUAL_JOBS } from '@/cms/operations/endpoints'
import { bucketSamples } from '@/cms/operations/read'

const SECRET = 's'.repeat(40)

describe('the Control Center talks to the agent with signed requests', () => {
  let server: Server
  let url = ''
  const seen: { path: string; body: string }[] = []

  beforeAll(async () => {
    const nonces = new NonceCache()
    server = createServer(async (req, res) => {
      let body = ''
      for await (const chunk of req) body += String(chunk)
      // The agent's own check (ops-agent/src/auth.ts).
      const auth = authenticate(SECRET, nonces, {
        method: req.method ?? 'GET',
        path: req.url ?? '/',
        headers: req.headers,
        body,
      })
      res.writeHead(auth.ok ? 200 : 401, { 'content-type': 'application/json' })
      if (auth.ok) seen.push({ path: req.url ?? '', body })
      res.end(JSON.stringify(auth.ok ? { samples: [], accepted: true } : { error: auth.reason }))
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })
  afterAll(() => server.close())

  it('needs an address and a key of at least 32 characters', () => {
    expect(agentSetup({})).toBeNull()
    expect(agentSetup({ OPS_AGENT_URL: url, OPS_AGENT_SECRET: 'short' })).toBeNull()
    expect(agentSetup({ OPS_AGENT_URL: 'ftp://agent', OPS_AGENT_SECRET: SECRET })).toBeNull()
    expect(agentSetup({ OPS_AGENT_URL: `${url}/x`, OPS_AGENT_SECRET: SECRET })).toEqual({
      url,
      secret: SECRET,
    })
  })

  it('reads with the query in the signature and acts with the body in it', async () => {
    const setup = { url, secret: SECRET }
    await agentRead('/v1/metrics', { since: '2026-10-21T10:00:00.000Z', empty: '' }, { setup })
    await agentAct('/v1/restart', { service: 'app' }, { setup })
    expect(seen).toEqual([
      { path: '/v1/metrics?since=2026-10-21T10%3A00%3A00.000Z', body: '' },
      { path: '/v1/restart', body: '{"service":"app"}' },
    ])
  })

  it('reports a wrong key, a missing agent and no configuration as such', async () => {
    const wrong = agentRead('/v1/status', {}, { setup: { url, secret: 'x'.repeat(40) } })
    await expect(wrong).rejects.toMatchObject({ reason: 'refused', status: 401, code: 'signature' })
    const missing = agentRead(
      '/v1/status',
      {},
      {
        setup: { url: 'http://127.0.0.1:9', secret: SECRET },
        timeoutMs: 2_000,
      },
    )
    await expect(missing).rejects.toMatchObject({ reason: 'unreachable' })
    await expect(agentRead('/v1/status', {}, { setup: null })).rejects.toBeInstanceOf(AgentError)
  })
})

const NOW = new Date('2026-10-22T10:00:00.000Z')
const HOUR = 3_600_000

const status = (overrides: Partial<AlertInput['status'] & object> = {}) =>
  ({
    agent: {
      version: '1',
      startedAt: new Date(NOW.getTime() - 72 * HOUR).toISOString(),
      tools: {},
      backup: {
        configured: true,
        media: 's3',
        schedule: { backup: '02:30', drillDay: 'sun', drill: '04:00' },
        timeZone: 'Europe/Berlin',
        keep: { daily: 7, weekly: 4, monthly: 6 },
        prune: true,
      },
      accessLog: true,
      certificateHosts: [],
      services: ['app', 'postgres'],
      restartable: ['app'],
    },
    docker: { reachable: true, error: null },
    containers: [
      {
        service: 'app',
        name: 'yop-app-1',
        state: 'running',
        status: 'Up',
        health: 'healthy',
        startedAt: null,
        image: 'app',
        imageId: 'x',
        restartCount: 0,
      },
      {
        service: 'postgres',
        name: 'yop-postgres-1',
        state: 'running',
        status: 'Up',
        health: 'healthy',
        startedAt: null,
        image: 'pg',
        imageId: 'y',
        restartCount: 0,
      },
    ],
    running: null,
    lastBackup: null,
    lastDrill: null,
    ...overrides,
  }) as NonNullable<AlertInput['status']>

const quiet: AlertInput = {
  now: NOW,
  failingSince: null,
  status: status(),
  newEvents: [],
  lastGoodBackupAt: new Date(NOW.getTime() - 8 * HOUR),
  certificates: [],
  latestSample: { diskUsedBytes: 40, diskTotalBytes: 100 },
}

const kinds = (input: Partial<AlertInput>) =>
  operationsAlerts({ ...quiet, ...input }).map((a) => `${a.kind}:${a.subject}`)

describe('warnings for the people who run the server', () => {
  it('stay quiet while everything is fine', () => {
    expect(kinds({})).toEqual([])
  })

  it('warn when the agent has been silent for 15 minutes, not sooner', () => {
    expect(kinds({ status: null, failingSince: new Date(NOW.getTime() - 14 * 60_000) })).toEqual([])
    expect(kinds({ status: null, failingSince: new Date(NOW.getTime() - 15 * 60_000) })).toEqual([
      'opsAgentUnreachable:ops-agent',
    ])
  })

  it('name a stopped, unhealthy or missing service', () => {
    const s = status()
    s.containers[0]!.state = 'exited'
    expect(kinds({ status: s })).toEqual(['opsServiceDown:app'])
    const unhealthy = status()
    unhealthy.containers[1]!.health = 'unhealthy'
    expect(kinds({ status: unhealthy })).toEqual(['opsServiceDown:postgres'])
    const missing = status()
    missing.containers.pop()
    expect(kinds({ status: missing })).toEqual(['opsServiceDown:postgres'])
  })

  it('notice a missing nightly backup after 26 hours, unless one is running', () => {
    const late = new Date(NOW.getTime() - 27 * HOUR)
    expect(kinds({ lastGoodBackupAt: late })).toEqual(['opsBackupOverdue:backup'])
    const running = status({ running: { kind: 'backup', trigger: 'schedule', startedAt: '' } })
    expect(kinds({ lastGoodBackupAt: late, status: running })).toEqual([])
    // A new installation: counted from the agent's start.
    const fresh = status()
    fresh.agent.startedAt = new Date(NOW.getTime() - 2 * HOUR).toISOString()
    expect(kinds({ lastGoodBackupAt: null, status: fresh })).toEqual([])
  })

  it('report each failed backup, drill and restart with its time (Berlin)', () => {
    const event = (kind: 'backup' | 'drill' | 'restart', ok: boolean) => ({
      id: kind,
      kind,
      trigger: 'schedule' as const,
      startedAt: '2026-10-22T00:30:00.000Z',
      finishedAt: '2026-10-22T00:32:00.000Z',
      ok,
      detail: kind === 'restart' ? { service: 'caddy' } : {},
    })
    expect(
      kinds({
        newEvents: [
          event('backup', false),
          event('drill', false),
          event('restart', false),
          event('backup', true),
        ],
      }),
    ).toEqual([
      'opsBackupFailed:2026-10-22 02:30',
      'opsDrillFailed:2026-10-22 02:30',
      'opsRestartFailed:caddy · 2026-10-22 02:30',
    ])
  })

  it('warn about certificates and a nearly full disk', () => {
    expect(
      kinds({
        certificates: [
          {
            host: 'a.example',
            ok: true,
            validTo: null,
            daysLeft: 60,
            issuer: null,
            trusted: true,
            error: null,
          },
          {
            host: 'b.example',
            ok: false,
            validTo: null,
            daysLeft: 9,
            issuer: null,
            trusted: true,
            error: null,
          },
        ],
        latestSample: { diskUsedBytes: 91, diskTotalBytes: 100 },
      }),
    ).toEqual(['opsCertificate:b.example', 'opsDiskFull:disk'])
  })
})

describe('host samples as 5-minute averages', () => {
  it('averages each slot and leaves gaps empty', () => {
    const now = new Date('2026-10-22T10:00:00.000Z')
    const series = bucketSamples(
      [
        { at: '2026-10-22T09:51:00.000Z', cpuPercent: 10, memoryUsed: 1, memoryTotal: 4 },
        { at: '2026-10-22T09:52:00.000Z', cpuPercent: 30, memoryUsed: 3, memoryTotal: 4 },
        { at: '2026-10-22T09:57:00.000Z', cpuPercent: 50, diskUsed: 9, diskTotal: 10 },
        { at: '2026-10-20T09:57:00.000Z', cpuPercent: 99 },
      ],
      now,
    )
    expect(series.cpu).toHaveLength(288)
    expect(series.cpu.at(-1)).toEqual({ t: '2026-10-22T10:00:00.000Z', v: null })
    expect(series.cpu.at(-2)).toEqual({ t: '2026-10-22T09:55:00.000Z', v: 50 })
    expect(series.cpu.at(-3)).toEqual({ t: '2026-10-22T09:50:00.000Z', v: 20 })
    expect(series.memory.at(-3)?.v).toBe(50)
    expect(series.disk.at(-2)?.v).toBe(90)
    expect(series.cpu.filter((p) => p.v != null)).toHaveLength(2)
  })
})

describe('log lines', () => {
  it('show the message and fields of JSON lines, with the level', () => {
    expect(
      parseLine(
        '2026-10-22T09:41:12.000Z {"level":50,"time":1,"msg":"render failed","status":500}',
      ),
    ).toEqual({
      time: '2026-10-22T09:41:12.000Z',
      level: 'error',
      text: 'render failed  status=500',
    })
    expect(parseLine('2026-10-22T09:41:12.000Z {"level":"warn","msg":"slow"}').level).toBe('warn')
    expect(parseLine('2026-10-22T09:41:12.000Z LOG:  checkpoint starting').level).toBe('info')
    expect(parseLine('2026-10-22T09:41:12.000Z ERROR: relation missing').level).toBe('error')
    expect(parseLine('no time stamp').text).toBe('no time stamp')
  })
})

describe('e-mail', () => {
  it('uses the Control Center settings, else the server settings', () => {
    const env = {
      SMTP_HOST: 'smtp.server.example',
      SMTP_PORT: '465',
      SMTP_USER: 'website',
      SMTP_PASSWORD: 'secret',
      SMTP_FROM: 'website@yop-ye.org',
      NOTIFY_EMAIL: 'info@yop-ye.org',
    }
    expect(resolveMailSettings(null, env)).toMatchObject({
      host: 'smtp.server.example',
      port: 465,
      passwordSet: true,
      fromAddress: 'website@yop-ye.org',
      notifyAddress: 'info@yop-ye.org',
      technicalAddress: null,
      domain: 'yop-ye.org',
      source: { host: 'server', fromAddress: 'server' },
    })
    const stored = {
      smtp: { host: ' mail.provider.example ', port: null, fromAddress: 'web@example.org' },
      addresses: { technical: 'tech@example.org' },
      domain: { dkimSelector: 'mail' },
    }
    expect(resolveMailSettings(stored, {})).toMatchObject({
      host: 'mail.provider.example',
      port: 587,
      passwordSet: false,
      technicalAddress: 'tech@example.org',
      domain: 'example.org',
      dkimSelector: 'mail',
      source: { host: 'settings', fromAddress: 'settings' },
    })
    expect(resolveMailSettings(null, {}).host).toBeNull()
  })

  it('keeps only the first letter and the domain of recipients in the delivery log', () => {
    expect(maskRecipients('info@yop-ye.org')).toBe('i***@yop-ye.org')
    expect(maskRecipients('"Vorstand" <vorstand@yop-ye.org>')).toBe('v***@yop-ye.org')
    expect(maskRecipients(['a@b.example', { address: 'c@d.example' }])).toBe(
      'a***@b.example, c***@d.example',
    )
    expect(maskRecipients('not an address')).toBe('***')
  })

  it('sends notices without personal data and escapes links', () => {
    const notice = newSubmissionMail('membership-applications', 'https://admin.example/x/1')
    expect(notice.text).toContain('https://admin.example/x/1')
    expect(notice.text).toContain('keine Angaben zur Person')
    const reset = passwordResetMail('https://admin.example/reset/a"b<c')
    expect(reset.html).toContain('a&#34;b&#60;c')
    expect(reset.html).not.toContain('a"b<c')
  })
})

describe('jobs by hand', () => {
  it('need a code for every job that deletes', () => {
    const deleting = Object.entries(MANUAL_JOBS)
      .filter(([, job]) => job.deletes)
      .map(([task]) => task)
      .sort()
    expect(deleting).toEqual([
      'audit-retention',
      'auth-cleanup',
      'notifications-retention',
      'ops-retention',
      'retention',
    ])
  })
})
