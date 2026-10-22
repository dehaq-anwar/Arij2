// Serves the production build for the end-to-end tests the way the Docker image does:
// the standalone server with static files and public/ next to it, bound to 0.0.0.0.
// (Binding the standalone server to 127.0.0.1 makes next-intl's internal rewrites look
// external and causes redirect loops; production always binds 0.0.0.0.)
//
// Before starting, it rebuilds the test database from scratch: all migrations, the seed
// content (with its placeholder images, stored in .e2e-media/) and the test data from
// scripts/e2e-fixtures.ts. The database is E2E_DATABASE_URL,
// or DATABASE_URL with "_e2e" appended to its name; it must end in "_e2e", because it is wiped.
import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { cpSync, existsSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const standalone = path.join(root, '.next', 'standalone')
if (!existsSync(path.join(standalone, 'server.js'))) {
  console.error('No production build found. Run `npm run build` first.')
  process.exit(1)
}

// Local runs read .env (the standalone server does not); variables already set win.
const envFile = path.join(root, '.env')
const fromFile = existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {}
const env = { ...fromFile, ...process.env }

const databaseUrl = (() => {
  if (env.E2E_DATABASE_URL) return env.E2E_DATABASE_URL
  if (!env.DATABASE_URL) return ''
  const url = new URL(env.DATABASE_URL)
  url.pathname = `${url.pathname}_e2e`
  return url.toString()
})()
const database = databaseUrl ? new URL(databaseUrl).pathname.slice(1) : ''
if (!database.endsWith('_e2e')) {
  console.error('Set E2E_DATABASE_URL to a PostgreSQL database whose name ends in "_e2e".')
  process.exit(1)
}

const port = env.E2E_PORT ?? '3100'
// Uploaded images go to a local folder (rebuilt per run) instead of S3.
const mediaDir = path.join(root, '.e2e-media')
rmSync(mediaDir, { recursive: true, force: true })
const serverEnv = {
  ...env,
  // Empty, not missing: the Payload CLI loads .env, which must not switch S3 back on.
  S3_BUCKET: '',
  DATABASE_URL: databaseUrl,
  MEDIA_DIR: mediaDir,
  SERVER_URL: `http://127.0.0.1:${port}`,
  // The Control Center on its own host, as in production: the tests open the website on
  // 127.0.0.1 and the admin on localhost (same server, separate cookies and rules).
  ADMIN_URL: `http://localhost:${port}`,
  ALLOW_INDEXING: 'false',
  // A stand-in for the operations agent (tests/e2e/fake-agent.ts) with a fresh key per run.
  OPS_AGENT_URL: `http://127.0.0.1:${env.FAKE_AGENT_PORT ?? '3199'}`,
  OPS_AGENT_SECRET: randomBytes(24).toString('hex'),
  // No mail server in the tests: e-mails are recorded as "not configured", never sent.
  SMTP_HOST: '',
  // The e-mail tests enter a closed local port as the mail server, to see a failure.
  MAIL_ALLOW_INTERNAL_HOSTS: 'true',
}

const payloadCli = path.join(root, 'node_modules', '.bin', 'payload')
for (const args of [
  ['migrate:fresh', '--force-accept-warning'],
  ['run', 'scripts/e2e-fixtures.ts'],
]) {
  console.log(`[e2e] payload ${args.join(' ')} (database "${database}")`)
  const result = spawnSync(payloadCli, args, { cwd: root, env: serverEnv, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

for (const [from, to] of [
  [path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static')],
  [path.join(root, 'public'), path.join(standalone, 'public')],
]) {
  rmSync(to, { recursive: true, force: true })
  cpSync(from, to, { recursive: true })
}
// Pages cached by an earlier run (e.g. against the development database) must not be served.
rmSync(path.join(standalone, '.next', 'cache'), { recursive: true, force: true })

const agent = spawn(process.execPath, [path.join(root, 'tests', 'e2e', 'fake-agent.ts')], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, OPS_AGENT_SECRET: serverEnv.OPS_AGENT_SECRET },
})
const server = spawn(process.execPath, ['server.js'], {
  cwd: standalone,
  stdio: 'inherit',
  env: { ...serverEnv, PORT: port, HOSTNAME: '0.0.0.0' },
})
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    agent.kill(signal)
    server.kill(signal)
  })
}
server.on('exit', (code) => {
  agent.kill()
  process.exit(code ?? 0)
})
