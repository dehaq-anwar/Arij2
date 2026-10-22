// Run inside the production app container (CI job "production", .github/workflows/ci.yml):
// the website and the Control Center answer on their own hosts, the admin gate holds, and the
// image optimizer's cache directory is writable on the read-only file system.
import { accessSync, constants } from 'node:fs'
import http from 'node:http'

const get = (path, host, gate) =>
  new Promise((resolve) => {
    const headers = { host }
    if (gate) headers['x-admin-gate'] = gate
    http
      .get({ host: '127.0.0.1', port: 3000, path, headers }, (response) => {
        response.resume()
        resolve(
          `${response.statusCode}${response.headers.location ? ` ${response.headers.location}` : ''}`,
        )
      })
      .on('error', (error) => resolve(`error ${error.message}`))
  })

const site = process.env.SITE_HOST
const admin = process.env.ADMIN_HOST
const gate = process.env.ADMIN_GATE_SECRET
const checks = [
  ['/', site, undefined, '200'],
  ['/en', site, undefined, '200'],
  ['/ar', site, undefined, '200'],
  ['/sitemap.xml', site, undefined, '200'],
  ['/admin', site, undefined, '404'],
  ['/api/users/me', site, undefined, '404'],
  ['/', admin, gate, '308 /admin'],
  ['/admin/login', admin, gate, '200'],
  ['/api/users/me', admin, gate, '200'],
  ['/admin/login', admin, 'wrong', '404'],
  ['/admin/login', admin, undefined, '404'],
]

let failed = 0
for (const [path, host, secret, expected] of checks) {
  const actual = await get(path, host, secret)
  const ok = actual === expected
  if (!ok) failed++
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${host}${path}${secret ? ` (gate ${secret === gate ? 'right' : 'wrong'})` : ''}: ${actual}${ok ? '' : `, expected ${expected}`}`,
  )
}
try {
  accessSync('/app/.next/cache', constants.W_OK)
  console.log('ok   /app/.next/cache is writable')
} catch {
  failed++
  console.log('FAIL /app/.next/cache is not writable')
}
process.exit(failed ? 1 : 0)
