// Serves the production build for the end-to-end tests the way the Docker image does:
// the standalone server with static files and public/ next to it, bound to 0.0.0.0.
// (Binding the standalone server to 127.0.0.1 makes next-intl's internal rewrites look
// external and causes redirect loops; production always binds 0.0.0.0.)
//
// Before starting, it rebuilds the test database from scratch: all migrations, the seed
// content and the test data from scripts/e2e-fixtures.ts. The database is E2E_DATABASE_URL,
// or DATABASE_URL with "_e2e" appended to its name; it must end in "_e2e", because it is wiped.
import { spawn, spawnSync } from 'node:child_process'
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
const serverEnv = {
  ...env,
  DATABASE_URL: databaseUrl,
  SERVER_URL: `http://127.0.0.1:${port}`,
  ALLOW_INDEXING: 'false',
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

const server = spawn(process.execPath, ['server.js'], {
  cwd: standalone,
  stdio: 'inherit',
  env: { ...serverEnv, PORT: port, HOSTNAME: '0.0.0.0' },
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal))
server.on('exit', (code) => process.exit(code ?? 0))
