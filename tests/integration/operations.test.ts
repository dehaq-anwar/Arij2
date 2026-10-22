import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

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
    const answers: Record<string, unknown> = {
      '/v1/status': status,
      '/v1/metrics': {
        samples: [sample(3), sample(2), sample(1)].filter((s) => !since || s.at > since),
      },
      '/v1/events': { events: events.filter((e) => !since || e.finishedAt > since) },
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

  it('records a failed delivery with its code and warns those who manage e-mail', async () => {
    await payload.updateGlobal({
      slug: 'email-settings',
      data: { smtp: { host: '127.0.0.1', port: 9, fromAddress: 'website@example.org' } },
    })
    await expect(
      payload.sendEmail({ to: 'info@example.org', subject: 'x', text: 'y' }),
    ).rejects.toBeTruthy()
    const { docs } = await payload.find({
      collection: 'email-log',
      where: { status: { equals: 'failed' } },
      depth: 0,
    })
    expect(docs).toHaveLength(1)
    expect(docs[0]).toMatchObject({ template: 'other', recipient: 'i***@example.org' })
    expect(docs[0]?.errorCode).toMatch(/ECONNECTION|ESOCKET|ECONNREFUSED/)
    expect(await notices(technical)).toContain('emailFailed:email')
    expect(await notices(board)).not.toContain('emailFailed:email')
  })
})
