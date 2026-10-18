// Serves the production build for the end-to-end tests the way the Docker image does:
// the standalone server with static files and public/ next to it, bound to 0.0.0.0.
// (Binding the standalone server to 127.0.0.1 makes next-intl's internal rewrites look
// external and causes redirect loops; production always binds 0.0.0.0.)
import { spawn } from 'node:child_process'
import { cpSync, existsSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const standalone = path.join(root, '.next', 'standalone')
if (!existsSync(path.join(standalone, 'server.js'))) {
  console.error('No production build found. Run `npm run build` first.')
  process.exit(1)
}
for (const [from, to] of [
  [path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static')],
  [path.join(root, 'public'), path.join(standalone, 'public')],
]) {
  rmSync(to, { recursive: true, force: true })
  cpSync(from, to, { recursive: true })
}

const server = spawn(process.execPath, ['server.js'], {
  cwd: standalone,
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.E2E_PORT ?? '3100', HOSTNAME: '0.0.0.0' },
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal))
server.on('exit', (code) => process.exit(code ?? 0))
