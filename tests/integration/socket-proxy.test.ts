import { spawnSync } from 'node:child_process'
import path from 'node:path'

import { mkdtempSync, readFileSync } from 'node:fs'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import os from 'node:os'

import { Agent } from '@ops/agent'
import { loadConfig } from '@ops/config'
import { Sampler } from '@ops/metrics'
import { StateStore } from '@ops/state'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { agentAct, agentRead, type AgentSetup } from '@/cms/operations/agent'

/**
 * The Docker socket proxy's rules (docker/socket-proxy/haproxy.cfg.template) against the real
 * proxy image from docker-compose.prod.yml and the real Docker API: the operations agent's calls
 * get through, everything else — creating or deleting containers, exec, images, file access,
 * restarting anything but the app and Caddy — is refused before it reaches Docker.
 *
 * The test starts its own containers with random names (yop-caddy-N, yop-postgres-N) as restart
 * targets; nothing else on the machine is touched. CI pulls the image first; locally the test is
 * skipped without Docker or the image.
 */
const root = path.resolve(__dirname, '../..')
const compose = readFileSync(path.join(root, 'docker-compose.prod.yml'), 'utf8')
const image = compose.match(/image: (tecnativa\/docker-socket-proxy:\S+)/)?.[1] ?? ''
const template = path.join(root, 'docker/socket-proxy/haproxy.cfg.template')

function docker(...args: string[]) {
  const result = spawnSync('docker', args, { encoding: 'utf8' })
  return { ok: result.status === 0, out: result.stdout.trim(), err: result.stderr.trim() }
}

const ready = Boolean(image) && docker('image', 'inspect', image).ok
if (process.env.CI && !ready) throw new Error(`Socket proxy image missing in CI: ${image}`)

const suffix = String(10_000 + Math.floor(Math.random() * 89_999))
const proxyName = `socket-proxy-test-${suffix}`
const caddy = `yop-caddy-${suffix}`
const postgres = `yop-postgres-${suffix}`
const project = `yopit${suffix}`
let base = ''

function startedAt(name: string) {
  return docker('inspect', '--format', '{{.State.StartedAt}}', name).out
}

async function call(method: string, pathname: string) {
  const response = await fetch(`${base}${pathname}`, { method })
  await response.arrayBuffer()
  return response.status
}

beforeAll(async () => {
  if (!ready) return
  for (const [name, service] of [
    [caddy, 'caddy'],
    [postgres, 'postgres'],
  ]) {
    // Labelled as Compose labels its containers, for the agent (last describe block).
    const target = docker(
      'run',
      '-d',
      '--init',
      '--name',
      name!,
      '--label',
      `com.docker.compose.project=${project}`,
      '--label',
      `com.docker.compose.service=${service}`,
      '--entrypoint',
      'sh',
      image,
      '-c',
      'echo "started with password=hunter2-${HOSTNAME}"; sleep 600',
    )
    if (!target.ok) throw new Error(target.err)
  }
  // As in docker-compose.prod.yml: read-only, socket read-only, the rules replace the template.
  const proxy = docker(
    'run',
    '-d',
    '--name',
    proxyName,
    '--read-only',
    '--tmpfs',
    '/tmp',
    '--tmpfs',
    '/run',
    '-e',
    'LOG_LEVEL=warning',
    '-e',
    'DISABLE_IPV6=1',
    '-v',
    '/var/run/docker.sock:/var/run/docker.sock:ro',
    '-v',
    `${template}:/usr/local/etc/haproxy/haproxy.cfg.template:ro`,
    '-p',
    '127.0.0.1::2375',
    image,
  )
  if (!proxy.ok) throw new Error(proxy.err)
  const port = docker('port', proxyName, '2375').out.split('\n')[0]?.split(':').pop()
  base = `http://127.0.0.1:${port}`
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      if ((await call('GET', '/_ping')) === 200) return
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`Socket proxy did not start: ${docker('logs', proxyName).err}`)
}, 60_000)

afterAll(() => {
  if (!ready) return
  docker('rm', '-f', proxyName, caddy, postgres)
})

describe.skipIf(!ready)('Docker socket proxy rules', () => {
  it('lets the agent read status and logs', async () => {
    expect(await call('GET', '/_ping')).toBe(200)
    expect(await call('GET', '/version')).toBe(200)
    expect(await call('GET', '/v1.47/containers/json?all=1')).toBe(200)
    expect(await call('GET', `/containers/${postgres}/json`)).toBe(200)
    expect(await call('GET', `/v1.47/containers/${postgres}/logs?stdout=1&tail=5`)).toBe(200)
  })

  it('restarts Caddy and the app, nothing else', async () => {
    const before = startedAt(caddy)
    expect(await call('POST', `/containers/${caddy}/restart?t=2`)).toBe(204)
    expect(startedAt(caddy)).not.toBe(before)

    const postgresBefore = startedAt(postgres)
    expect(await call('POST', `/containers/${postgres}/restart?t=2`)).toBe(403)
    expect(await call('POST', `/containers/${postgres}/stop`)).toBe(403)
    expect(await call('POST', `/containers/${postgres}/kill`)).toBe(403)
    expect(startedAt(postgres)).toBe(postgresBefore)
    // The allowed path reaches Docker (a missing container is Docker's 404, not the proxy's 403).
    expect(await call('POST', `/v1.47/containers/yop-app-${suffix}/restart`)).toBe(404)
  })

  it('refuses everything that could take over the host or read secrets', async () => {
    const refused: Array<[string, string]> = [
      ['POST', '/containers/create'],
      ['POST', `/v1.47/containers/create?name=yop-app-${suffix}`],
      ['POST', `/containers/${caddy}/exec`],
      ['POST', '/exec/abc/start'],
      ['DELETE', `/containers/${postgres}`],
      ['POST', `/containers/${postgres}/update`],
      ['POST', `/containers/${caddy}/restart/../../create`],
      ['GET', `/containers/${postgres}/archive?path=/etc`],
      ['GET', `/containers/${postgres}/export`],
      ['GET', '/images/json'],
      ['POST', '/images/create?fromImage=alpine'],
      ['GET', '/volumes'],
      ['GET', '/networks'],
      ['GET', '/info'],
      ['GET', '/events'],
      ['POST', '/build'],
      ['GET', '/secrets'],
      ['POST', '/swarm/init'],
    ]
    for (const [method, pathname] of refused) {
      expect(`${method} ${pathname}: ${await call(method, pathname)}`).toBe(
        `${method} ${pathname}: 403`,
      )
    }
  })
})

/**
 * The whole chain as in production: the Control Center's agent client (src/cms/operations/
 * agent.ts) signs its requests, the real agent checks them and talks to Docker only through the
 * real proxy. The proxy's rules come from the same template; the containers are this test's own.
 */
describe.skipIf(!ready)('Control Center → agent → socket proxy → Docker', () => {
  let server: Server | undefined
  let setup: AgentSetup = null

  beforeAll(async () => {
    const secret = 'chain-test-'.padEnd(48, 'x')
    const stateDir = mkdtempSync(path.join(os.tmpdir(), 'yop-agent-chain-'))
    const config = loadConfig({
      OPS_AGENT_SECRET: secret,
      HOST: '127.0.0.1',
      DOCKER_URL: base,
      COMPOSE_PROJECT: project,
      SERVICES: 'caddy,postgres',
      STATE_DIR: stateDir,
    })
    const state = new StateStore(path.join(stateDir, 'state.json'))
    await state.load()
    // Any free port: the agent's own port (4100) may be taken on this machine.
    server = await new Agent({
      config: { ...config, port: 0 },
      state,
      sampler: new Sampler(stateDir),
    }).listen()
    setup = { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, secret }
  })

  afterAll(async () => {
    await new Promise((resolve) => server?.close(resolve))
  })

  it('shows the services, reads masked logs and restarts Caddy', async () => {
    const status = await agentRead('/v1/status', {}, { setup })
    expect(status.docker.reachable).toBe(true)
    expect(status.containers.map((c) => [c.service, c.name, c.state]).sort()).toEqual([
      ['caddy', caddy, 'running'],
      ['postgres', postgres, 'running'],
    ])

    const logs = await agentRead('/v1/logs', { service: 'postgres', lines: 5 }, { setup })
    expect(logs.lines.join('\n')).toContain('password=[hidden]')
    expect(logs.lines.join('\n')).not.toContain('hunter2')

    const before = startedAt(caddy)
    expect(await agentAct('/v1/restart', { service: 'caddy' }, { setup })).toMatchObject({
      accepted: true,
    })
    // The agent answers first and restarts a moment later (Docker waits up to 20 s for exit).
    for (let i = 0; i < 150 && startedAt(caddy) === before; i++) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
    expect(startedAt(caddy)).not.toBe(before)
    await expect
      .poll(async () => (await agentRead('/v1/events', {}, { setup })).events.at(-1))
      .toMatchObject({ kind: 'restart', ok: true, detail: { service: 'caddy' } })
  }, 60_000)

  it('refuses unsigned or wrongly signed requests and services that may not restart', async () => {
    const unsigned = await fetch(`${setup!.url}/v1/status`)
    expect(unsigned.status).toBe(401)
    await expect(
      agentRead('/v1/status', {}, { setup: { url: setup!.url, secret: 'w'.repeat(48) } }),
    ).rejects.toMatchObject({ reason: 'refused', status: 401 })
    const before = startedAt(postgres)
    await expect(agentAct('/v1/restart', { service: 'postgres' }, { setup })).rejects.toMatchObject(
      { reason: 'refused', status: 403 },
    )
    expect(startedAt(postgres)).toBe(before)
  })
})
