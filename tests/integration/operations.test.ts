import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import net, { type AddressInfo } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import tls from 'node:tls'

import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { authenticate, NonceCache } from '@ops/auth'

import { startPayload } from './database'

/**
 * The collection job (src/cms/operations/collect.ts) against a migrated database and a stand-in
 * agent that checks signatures like the real one: samples, mirrored events, the state, warnings
 * in the bell for those who may act (once a day), the agent's silence, retention, and the
 * delivery log of the e-mail adapter.
 */
const SECRET = 'i'.repeat(40)
const NOW = new Date('2026-10-22T08:00:00.000Z')
const HOUR = 3_600_000
const iso = (ms: number) => new Date(NOW.getTime() - ms).toISOString()

let payload: Payload
let stop: () => Promise<void>
let agent: Server
let agentUrl = ''
let technical = 0
let board = 0
let hourViews = 10
const accessCalls: string[] = []

const events = [
  {
    id: 'ev-backup',
    kind: 'backup',
    trigger: 'schedule',
    startedAt: iso(6 * HOUR),
    finishedAt: iso(6 * HOUR - 60_000),
    ok: false,
    detail: { error: 'repository is locked' },
  },
  {
    id: 'ev-drill',
    kind: 'drill',
    trigger: 'schedule',
    startedAt: iso(4 * HOUR),
    finishedAt: iso(4 * HOUR - 60_000),
    ok: true,
    detail: { tablesCompared: 60 },
  },
]

const status = {
  agent: {
    version: 'it',
    startedAt: iso(72 * HOUR),
    tools: {},
    backup: {
      configured: true,
      media: 'none',
      schedule: { backup: '02:30', drillDay: 'sun', drill: '04:00' },
      timeZone: 'Europe/Berlin',
      keep: { daily: 7, weekly: 4, monthly: 6 },
      prune: true,
    },
    accessLog: false,
    certificateHosts: ['yop-ye.org'],
    services: ['app', 'postgres'],
    restartable: ['app'],
  },
  docker: { reachable: true, error: null },
  containers: [
    {
      service: 'app',
      name: 'yop-app-1',
      state: 'exited',
      status: 'Exited (1)',
      health: null,
      startedAt: null,
      image: 'app',
      imageId: 'x',
      restartCount: 3,
    },
    {
      service: 'postgres',
      name: 'yop-postgres-1',
      state: 'running',
      status: 'Up',
      health: 'healthy',
      startedAt: iso(72 * HOUR),
      image: 'pg',
      imageId: 'y',
      restartCount: 0,
    },
  ],
  running: null,
  lastBackup: null,
  lastDrill: null,
}

const sample = (minutesAgo: number) => ({
  at: iso(minutesAgo * 60_000),
  cpuPercent: 12.5,
  memoryUsedBytes: 1_000,
  memoryTotalBytes: 4_000,
  load1: 0.2,
  diskUsedBytes: 50,
  diskTotalBytes: 100,
})

const user = async (name: string, role: string) =>
  (
    await payload.create({
      collection: 'users',
      data: {
        name,
        email: `${name.toLowerCase()}@example.test`,
        password: 'integration-password-1234',
        role: role as never,
      },
      context: { serverCommand: true },
    })
  ).id as number

const notices = async (recipient: number) =>
  (
    await payload.find({
      collection: 'notifications',
      where: { recipient: { equals: recipient } },
      sort: 'createdAt',
      limit: 50,
      depth: 0,
    })
  ).docs.map((doc) => `${doc.kind}:${doc.subjectId}`)

beforeAll(async () => {
  const started = await startPayload('operations')
  payload = started.payload
  stop = started.stop
  const nonces = new NonceCache()
  agent = createServer(async (req, res) => {
    let body = ''
    for await (const chunk of req) body += String(chunk)
    const auth = authenticate(SECRET, nonces, {
      method: req.method ?? 'GET',
      path: req.url ?? '/',
      headers: req.headers,
      body,
    })
    const url = new URL(req.url ?? '/', 'http://agent')
    const since = url.searchParams.get('since')
    accessCalls.push(url.pathname === '/v1/access' ? url.search : '')
    const answers: Record<string, unknown> = {
      '/v1/status': status,
      '/v1/metrics': {
        samples: [sample(3), sample(2), sample(1)].filter((s) => !since || s.at > since),
      },
      '/v1/events': { events: events.filter((e) => !since || e.finishedAt > since) },
      '/v1/access': {
        // Two hours inside the asked range (the agent only reports hours it has lines for).
        hours: [iso(3 * HOUR), iso(2 * HOUR)]
          .map((at) => new Date(Math.floor(new Date(at).getTime() / HOUR) * HOUR).toISOString())
          .filter((at) => (!since || at >= since) && at < (url.searchParams.get('until') ?? ''))
          .map((hour) => ({
            hour,
            requests: 30,
            views: hourViews,
            entrances: 3,
            bots: 2,
            notFound: 1,
            serverErrors: 0,
            pages: [{ path: '/', locale: 'de', views: hourViews, entrances: 3 }],
            referrers: [],
            notFoundPaths: [{ path: '/alt', count: 1 }],
            errors: [],
          })),
      },
      '/v1/certificates': {
        certificates: [
          {
            host: 'yop-ye.org',
            ok: false,
            validTo: iso(-9 * 24 * HOUR),
            daysLeft: 9,
            issuer: 'R11',
            trusted: true,
            error: null,
          },
        ],
      },
    }
    res.writeHead(auth.ok ? 200 : 401, { 'content-type': 'application/json' })
    res.end(JSON.stringify(auth.ok ? (answers[url.pathname] ?? {}) : { error: auth.reason }))
  })
  await new Promise<void>((resolve) => agent.listen(0, '127.0.0.1', resolve))
  agentUrl = `http://127.0.0.1:${(agent.address() as AddressInfo).port}`
  technical = await user('Technik', 'technicalAdmin')
  board = await user('Vorstand', 'boardAdmin')
})

afterAll(async () => {
  agent?.close()
  await stop?.()
})

describe('collecting from the operations agent', () => {
  it('stores samples, events and the state, and warns those who may act', async () => {
    const { collectOperations } = await import('@/cms/operations/collect')
    const setup = { url: agentUrl, secret: SECRET }
    const first = await collectOperations(payload, { now: NOW, setup })
    expect(first).toMatchObject({ configured: true, reachable: true, samples: 3, events: 2 })

    const samples = await payload.find({ collection: 'ops-samples', sort: 'at', depth: 0 })
    expect(samples.totalDocs).toBe(3)
    expect(samples.docs[0]?.databaseBytes).toBeGreaterThan(1_000_000)
    const mirrored = await payload.find({ collection: 'ops-events', sort: 'startedAt', depth: 0 })
    expect(mirrored.docs.map((e) => `${e.kind}:${e.ok}`)).toEqual(['backup:false', 'drill:true'])
    const state = (await payload.findGlobal({ slug: 'operations-state', depth: 0 })) as unknown as {
      lastContactAt: string
      lastSampleAt: string
      certificates: unknown[]
      database: { bytes: number; tables: unknown[] }
    }
    expect(state.lastContactAt).toBe(NOW.toISOString())
    expect(state.lastSampleAt).toBe(sample(1).at)
    expect(state.certificates).toHaveLength(1)
    expect(state.database.tables.length).toBeGreaterThan(0)

    expect((await notices(technical)).sort()).toEqual([
      'opsBackupFailed:2026-10-22 04:00',
      'opsBackupOverdue:backup',
      'opsCertificate:yop-ye.org',
      'opsServiceDown:app',
    ])
    // The board reads operations but does not act on them: no warnings.
    expect(await notices(board)).toEqual([])

    // The next run: nothing new to store, the same warnings not again (once a day).
    const second = await collectOperations(payload, {
      now: new Date(NOW.getTime() + 5 * 60_000),
      setup,
    })
    expect(second).toMatchObject({ reachable: true, samples: 0, events: 0 })
    expect(await payload.count({ collection: 'ops-samples' })).toMatchObject({ totalDocs: 3 })
    expect(await notices(technical)).toHaveLength(4)
  })

  it('warns when the agent has been silent for 15 minutes', async () => {
    const { collectOperations } = await import('@/cms/operations/collect')
    const setup = { url: 'http://127.0.0.1:9', secret: SECRET }
    const later = new Date(NOW.getTime() + HOUR)
    const silent = await collectOperations(payload, { now: later, setup })
    expect(silent.reachable).toBe(false)
    expect(await notices(technical)).not.toContain('opsAgentUnreachable:ops-agent')
    await collectOperations(payload, { now: new Date(later.getTime() + 15 * 60_000), setup })
    expect(await notices(technical)).toContain('opsAgentUnreachable:ops-agent')
    const state = (await payload.findGlobal({ slug: 'operations-state', depth: 0 })) as unknown as {
      failingSince: string
      lastContactAt: string
    }
    expect(state.failingSince).toBe(later.toISOString())
    // The last known state stays.
    expect(state.lastContactAt).toBe(new Date(NOW.getTime() + 5 * 60_000).toISOString())
  })

  it('without an agent keeps the database figures and says "not set up"', async () => {
    const { collectOperations } = await import('@/cms/operations/collect')
    const result = await collectOperations(payload, { now: NOW, setup: null })
    expect(result).toEqual({
      configured: false,
      reachable: false,
      samples: 0,
      events: 0,
      alerts: 0,
    })
    const state = (await payload.findGlobal({ slug: 'operations-state', depth: 0 })) as unknown as {
      lastError: string
      database: { bytes: number }
    }
    expect(state.lastError).toBe('not_configured')
    expect(state.database.bytes).toBeGreaterThan(0)
  })

  it('deletes samples after 30 days and nothing younger', async () => {
    const { purgeOperations } = await import('@/cms/operations/retention')
    await payload.create({
      collection: 'ops-samples',
      data: { at: iso(31 * 24 * HOUR), cpuPercent: 1 },
    })
    const removed = await purgeOperations(payload, NOW)
    expect(removed.samples).toBe(1)
    expect(await payload.count({ collection: 'ops-samples' })).toMatchObject({ totalDocs: 3 })
  })
})

describe('the delivery log', () => {
  it('records e-mails without a mail server as not configured, recipient shortened', async () => {
    await payload.sendEmail({
      to: 'person@example.org',
      subject: 'Test',
      text: 'Test',
      headers: { 'X-YOP-Template': 'test' },
    })
    const { docs } = await payload.find({ collection: 'email-log', depth: 0 })
    expect(docs.map((d) => [d.template, d.recipient, d.status])).toEqual([
      ['test', 'p***@example.org', 'notConfigured'],
    ])
  })

  const failures = async () =>
    (
      await payload.find({
        collection: 'email-log',
        where: { status: { equals: 'failed' } },
        sort: 'createdAt',
        depth: 0,
      })
    ).docs

  it("a server entered on the screen inside the server's network, or on another port, is not used", async () => {
    const fromAddress = 'website@example.org'
    for (const [smtp, code] of [
      [{ host: '127.0.0.1', port: 587 }, 'HOST_NOT_ALLOWED'],
      [{ host: '10.1.2.3', port: 25 }, 'HOST_NOT_ALLOWED'],
      [{ host: 'smtp.example.org', port: 9 }, 'PORT_NOT_ALLOWED'],
    ] as const) {
      await payload.updateGlobal({
        slug: 'email-settings',
        data: { smtp: { ...smtp, fromAddress } },
      })
      await expect(
        payload.sendEmail({ to: 'info@example.org', subject: 'x', text: 'y' }),
      ).rejects.toMatchObject({ code })
    }
    // Refused before any connection, logged like any failed delivery.
    expect((await failures()).map((d) => d.errorCode)).toEqual([
      'HOST_NOT_ALLOWED',
      'HOST_NOT_ALLOWED',
      'PORT_NOT_ALLOWED',
    ])
  })

  it('delivers over TLS through the configured server and records it as sent', async () => {
    const relay = await startSmtpRelay()
    process.env.MAIL_ALLOW_INTERNAL_HOSTS = 'true'
    try {
      await payload.updateGlobal({
        slug: 'email-settings',
        data: {
          smtp: { host: '127.0.0.1', port: relay.port, fromAddress: 'website@example.org' },
        },
      })
      await payload.sendEmail({
        to: 'person@example.org',
        subject: 'Zustellung',
        text: 'Inhalt der Nachricht',
        headers: { 'X-YOP-Template': 'test' },
      })
    } finally {
      delete process.env.MAIL_ALLOW_INTERNAL_HOSTS
      await relay.close()
    }
    // STARTTLS is required on every port but 465: the message was only sent encrypted.
    expect(relay.messages).toHaveLength(1)
    expect(relay.messages[0]).toMatchObject({
      tls: true,
      from: 'website@example.org',
      to: ['person@example.org'],
    })
    expect(relay.messages[0]?.data).toContain('Subject: Zustellung')
    expect(relay.messages[0]?.data).toContain('Inhalt der Nachricht')
    // The template marker is for the log only and does not leave the server.
    expect(relay.messages[0]?.data).not.toMatch(/X-YOP-Template/i)
    const { docs } = await payload.find({
      collection: 'email-log',
      where: { status: { equals: 'sent' } },
      depth: 0,
    })
    expect(docs.map((d) => [d.template, d.recipient])).toEqual([['test', 'p***@example.org']])
  })

  it('records a failed delivery with its code and warns those who manage e-mail', async () => {
    // A relay inside the network, allowed on the server (as the end-to-end tests do).
    process.env.MAIL_ALLOW_INTERNAL_HOSTS = 'true'
    try {
      await payload.updateGlobal({
        slug: 'email-settings',
        data: { smtp: { host: '127.0.0.1', port: 9, fromAddress: 'website@example.org' } },
      })
      await expect(
        payload.sendEmail({ to: 'info@example.org', subject: 'x', text: 'y' }),
      ).rejects.toBeTruthy()
    } finally {
      delete process.env.MAIL_ALLOW_INTERNAL_HOSTS
    }
    const last = (await failures()).at(-1)
    expect(last).toMatchObject({ template: 'other', recipient: 'i***@example.org' })
    expect(last?.errorCode).toMatch(/ECONNECTION|ESOCKET|ECONNREFUSED/)
    expect(await notices(technical)).toContain('emailFailed:email')
    expect(await notices(board)).not.toContain('emailFailed:email')
  })
})

describe('visitor statistics', () => {
  it('stores complete hours once, replaces a recounted hour and keeps a cursor', async () => {
    const { collectAnalytics } = await import('@/cms/analytics/collect')
    const setup = { url: agentUrl, secret: SECRET }
    const first = await collectAnalytics(payload, { now: NOW, setup })
    expect(first).toEqual({ configured: true, hours: 2 })
    // Only complete hours, at most the 7 days the agent keeps.
    const asked = new URLSearchParams(accessCalls.filter(Boolean).at(-1))
    expect(asked.get('until')).toBe('2026-10-22T08:00:00.000Z')
    expect(asked.get('since')).toBe('2026-10-15T08:00:00.000Z')
    expect(await payload.count({ collection: 'access-stats' })).toMatchObject({ totalDocs: 2 })

    // Within the same hour: nothing to ask for.
    expect(
      await collectAnalytics(payload, { now: new Date(NOW.getTime() + 20 * 60_000), setup }),
    ).toEqual({ configured: true, hours: 0 })

    // A recount of the same hours (e.g. after the cursor was reset) replaces, never adds.
    await payload.updateGlobal({
      slug: 'operations-state',
      data: { accessCollectedUntil: null } as never,
    })
    hourViews = 12
    await collectAnalytics(payload, { now: NOW, setup })
    const { docs } = await payload.find({ collection: 'access-stats', sort: 'hour', depth: 0 })
    expect(docs.map((d) => d.views)).toEqual([12, 12])
  })

  it('two runs at the same moment (schedule and "run now") neither fail nor double', async () => {
    const { collectAnalytics } = await import('@/cms/analytics/collect')
    const setup = { url: agentUrl, secret: SECRET }
    await payload.updateGlobal({
      slug: 'operations-state',
      data: { accessCollectedUntil: null } as never,
    })
    const results = await Promise.all([
      collectAnalytics(payload, { now: NOW, setup }),
      collectAnalytics(payload, { now: NOW, setup }),
    ])
    expect(results).toEqual([
      { configured: true, hours: 2 },
      { configured: true, hours: 2 },
    ])
    expect(await payload.count({ collection: 'access-stats' })).toMatchObject({ totalDocs: 2 })
  })

  it('without an agent there is nothing to collect', async () => {
    const { collectAnalytics } = await import('@/cms/analytics/collect')
    expect(await collectAnalytics(payload, { now: NOW, setup: null })).toEqual({
      configured: false,
      hours: 0,
    })
  })
})

/**
 * A minimal SMTP server on 127.0.0.1 with STARTTLS and a certificate made for this run, trusted
 * by this test process only (tls.setDefaultCACertificates). It records what it receives.
 */
async function startSmtpRelay() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'yop-smtp-'))
  const made = spawnSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-days',
      '1',
      '-subj',
      '/CN=127.0.0.1',
      '-addext',
      'subjectAltName=IP:127.0.0.1',
      '-keyout',
      `${dir}/key.pem`,
      '-out',
      `${dir}/cert.pem`,
    ],
    { encoding: 'utf8' },
  )
  if (made.status !== 0) throw new Error(made.stderr)
  const key = readFileSync(`${dir}/key.pem`)
  const cert = readFileSync(`${dir}/cert.pem`, 'utf8')
  tls.setDefaultCACertificates([...tls.getCACertificates('default'), cert])

  const messages: { tls: boolean; from: string; to: string[]; data: string }[] = []
  const server = net.createServer((plain) => {
    let socket: net.Socket = plain
    let secure = false
    let current = { from: '', to: [] as string[] }
    let data: string[] | null = null
    let buffer = ''
    const reply = (line: string) => socket.write(`${line}\r\n`)
    const onLine = (line: string) => {
      if (data) {
        if (line === '.') {
          messages.push({ tls: secure, ...current, data: data.join('\n') })
          data = null
          current = { from: '', to: [] }
          reply('250 2.0.0 queued')
        } else data.push(line.startsWith('..') ? line.slice(1) : line)
        return
      }
      const command = line.slice(0, 4).toUpperCase()
      if (command === 'EHLO') reply(secure ? '250 relay' : '250-relay\r\n250 STARTTLS')
      else if (command === 'STAR') {
        reply('220 2.0.0 ready')
        socket.removeAllListeners('data')
        socket = new tls.TLSSocket(plain, { isServer: true, key, cert })
        secure = true
        buffer = ''
        socket.on('data', onData)
      } else if (command === 'MAIL') {
        current.from = /<([^>]*)>/.exec(line)?.[1] ?? ''
        reply('250 2.1.0 ok')
      } else if (command === 'RCPT') {
        current.to.push(/<([^>]*)>/.exec(line)?.[1] ?? '')
        reply('250 2.1.5 ok')
      } else if (command === 'DATA') {
        data = []
        reply('354 go ahead')
      } else if (command === 'QUIT') {
        reply('221 2.0.0 bye')
        socket.end()
      } else if (command === 'RSET' || command === 'NOOP') reply('250 2.0.0 ok')
      else reply('502 5.5.2 not implemented')
    }
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8')
      let end
      while ((end = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, end)
        buffer = buffer.slice(end + 2)
        onLine(line)
      }
    }
    socket.on('data', onData)
    socket.on('error', () => {})
    reply('220 relay ESMTP')
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {
    port: (server.address() as AddressInfo).port,
    messages,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}
