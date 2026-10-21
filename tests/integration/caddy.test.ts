import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import https from 'node:https'
import http from 'node:http'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * The production Caddyfile (docker/caddy/Caddyfile) with the Caddy image from
 * docker-compose.prod.yml, in front of a stand-in for the app that echoes what it receives:
 * the admin gate header reaches the app only through the Control Center's host (a visitor
 * cannot send it through the website's host, nor forge it), the IP allowlist closes the
 * Control Center, HTTP and www redirect, and the access log holds no full IP address, query
 * string or cookie. Host names under .localhost get certificates from Caddy's internal CA.
 *
 * CI pulls the image first. Locally CADDY_IMAGE can name another Caddy 2 image; without Docker,
 * the image or the agent image (it provides Node for the stand-in) the test is skipped.
 */
const root = path.resolve(__dirname, '../..')
const compose = readFileSync(path.join(root, 'docker-compose.prod.yml'), 'utf8')
const image = process.env.CADDY_IMAGE ?? compose.match(/image: (caddy:\S+)/)?.[1] ?? ''
const upstreamImage = process.env.OPS_AGENT_IMAGE ?? 'yop-ops-agent:test'
const caddyfile = path.join(root, 'docker/caddy/Caddyfile')

function docker(...args: string[]) {
  const result = spawnSync('docker', args, { encoding: 'utf8' })
  return { ok: result.status === 0, out: result.stdout.trim(), err: result.stderr.trim() }
}

const ready =
  Boolean(image) &&
  docker('image', 'inspect', image).ok &&
  docker('image', 'inspect', upstreamImage).ok
if (process.env.CI && !ready) throw new Error(`Caddy test images missing in CI: ${image}`)

const suffix = String(10_000 + Math.floor(Math.random() * 89_999))
const network = `caddy-test-${suffix}`
const upstream = `caddy-test-app-${suffix}`
const containers: string[] = [upstream]
const SITE = 'site.localhost'
const ADMIN = 'admin.localhost'
const GATE = 'gate-secret-for-the-test-only-0123456789'

type Ports = { http: string; https: string; name: string }
let open: Ports
let closed: Ports

// The stand-in for the app: answers every request with the path and headers it received.
const ECHO = `require('node:http').createServer((q, s) => {
  s.setHeader('content-type', 'application/json')
  s.end(JSON.stringify({ url: q.url, headers: q.headers }))
}).listen(3000)`

function startCaddy(name: string, allowIps?: string): Ports {
  const env = [
    'ACME_EMAIL=test@example.org',
    `SITE_HOST=${SITE}`,
    `ADMIN_HOST=${ADMIN}`,
    `ADMIN_GATE_SECRET=${GATE}`,
    ...(allowIps ? [`ADMIN_ALLOW_IPS=${allowIps}`] : []),
  ].flatMap((value) => ['-e', value])
  // As in docker-compose.prod.yml: read-only, no capabilities but binding ports 80 and 443.
  const result = docker(
    'run',
    '-d',
    '--name',
    name,
    '--network',
    network,
    '--read-only',
    '--tmpfs',
    '/tmp',
    '--tmpfs',
    '/data',
    '--tmpfs',
    '/config',
    '--tmpfs',
    '/var/log/caddy',
    '--cap-drop',
    'ALL',
    '--cap-add',
    'NET_BIND_SERVICE',
    ...env,
    '-v',
    `${caddyfile}:/etc/caddy/Caddyfile:ro`,
    '-p',
    '127.0.0.1::80',
    '-p',
    '127.0.0.1::443',
    image,
  )
  if (!result.ok) throw new Error(result.err)
  containers.push(name)
  const port = (inner: string) =>
    docker('port', name, inner).out.split('\n')[0]?.split(':').pop() ?? ''
  return { http: port('80'), https: port('443'), name }
}

type Answer = { status: number; location?: string; body: string }

function request(
  port: string,
  host: string,
  pathname: string,
  headers: Record<string, string> = {},
  secure = true,
): Promise<Answer> {
  const options = {
    host: '127.0.0.1',
    port: Number(port),
    path: pathname,
    headers: { host, ...headers },
    ...(secure ? { servername: host, rejectUnauthorized: false } : {}),
  }
  return new Promise((resolve, reject) => {
    const req = (secure ? https : http).request(options, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk: string) => (body += chunk))
      res.on('end', () =>
        resolve({ status: res.statusCode ?? 0, location: res.headers.location, body }),
      )
    })
    req.on('error', reject)
    req.end()
  })
}

async function waitFor(ports: Ports) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const answer = await request(ports.https, SITE, '/')
      if (answer.status === 200) return
    } catch {
      // Not ready yet (certificates are issued on start).
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`Caddy did not start: ${docker('logs', ports.name).err}`)
}

beforeAll(async () => {
  if (!ready) return
  if (!docker('network', 'create', network).ok) throw new Error('network')
  const app = docker(
    'run',
    '-d',
    '--name',
    upstream,
    '--network',
    network,
    '--network-alias',
    'app',
    upstreamImage,
    'node',
    '-e',
    ECHO,
  )
  if (!app.ok) throw new Error(app.err)
  open = startCaddy(`caddy-test-open-${suffix}`)
  // TEST-NET-1: no request in the test comes from there.
  closed = startCaddy(`caddy-test-closed-${suffix}`, '192.0.2.0/24')
  await Promise.all([waitFor(open), waitFor(closed)])
}, 120_000)

afterAll(() => {
  if (!ready) return
  docker('rm', '-f', ...containers)
  docker('network', 'rm', network)
})

const headersOf = (answer: Answer) =>
  (JSON.parse(answer.body) as { headers: Record<string, string> }).headers

describe.skipIf(!ready)('Caddy in front of the app', () => {
  it('sends the admin gate only through the Control Center host', async () => {
    const site = await request(open.https, SITE, '/de', { 'x-admin-gate': GATE })
    expect(site.status).toBe(200)
    expect(headersOf(site)['x-admin-gate']).toBeUndefined()

    const admin = await request(open.https, ADMIN, '/admin', { 'x-admin-gate': 'forged' })
    expect(admin.status).toBe(200)
    expect(headersOf(admin)['x-admin-gate']).toBe(GATE)
  })

  it('passes on the real client address, not one the visitor sent', async () => {
    // The app's rate limits count by X-Forwarded-For (src/lib/forms/rate-limit.ts).
    for (const host of [SITE, ADMIN]) {
      const answer = await request(open.https, host, '/', { 'x-forwarded-for': '198.51.100.23' })
      const forwarded = headersOf(answer)['x-forwarded-for'] ?? ''
      expect(forwarded).toMatch(/^[0-9a-f.:]+$/)
      expect(forwarded).not.toContain('198.51.100.23')
    }
  })

  it('closes the Control Center outside the allowed networks, not the website', async () => {
    expect((await request(closed.https, ADMIN, '/admin')).status).toBe(404)
    expect((await request(closed.https, ADMIN, '/api/users/me')).status).toBe(404)
    expect((await request(closed.https, SITE, '/de')).status).toBe(200)
  })

  it('redirects HTTP to HTTPS and www to the main host', async () => {
    const plain = await request(open.http, SITE, '/de/kontakt', {}, false)
    expect(plain.status).toBe(308)
    expect(plain.location).toBe(`https://${SITE}/de/kontakt`)

    const www = await request(open.https, `www.${SITE}`, '/en?x=1')
    expect(www.status).toBe(301)
    expect(www.location).toBe(`https://${SITE}/en?x=1`)
  })

  it('writes access logs without full addresses, query strings or credentials', async () => {
    await request(open.https, SITE, '/de/aktuelles?token=abc123secret', {
      cookie: 'payload-token=secret-cookie',
      authorization: 'Bearer secret-bearer',
      'x-forwarded-for': '198.51.100.23',
    })
    await request(open.https, ADMIN, '/admin?email=someone@example.org')
    let site = ''
    for (let attempt = 0; attempt < 20 && !site.includes('/de/aktuelles'); attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      site = docker('exec', open.name, 'cat', '/var/log/caddy/access.log').out
    }
    const admin = docker('exec', open.name, 'cat', '/var/log/caddy/admin-access.log').out
    const entries = [...site.split('\n'), ...admin.split('\n')]
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { request: Record<string, unknown> })
    expect(entries.some((entry) => entry.request.uri === '/de/aktuelles')).toBe(true)
    expect(entries.some((entry) => entry.request.uri === '/admin')).toBe(true)
    for (const entry of entries) {
      expect(String(entry.request.remote_ip)).toMatch(/\.0$|::$/)
      expect(entry.request.remote_port).toBeUndefined()
    }
    for (const secret of [
      'abc123secret',
      'secret-cookie',
      'secret-bearer',
      '198.51.100.23',
      'someone@example.org',
      GATE,
    ]) {
      expect(site + admin).not.toContain(secret)
    }
  })
})
