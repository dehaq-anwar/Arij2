import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

import { defineConfig, devices } from '@playwright/test'

// Set once in the main process; the web server (which creates the test editor account) and
// the test workers inherit both values.
process.env.E2E_PORT ??= '3100'
process.env.E2E_EDITOR_PASSWORD ??= randomBytes(24).toString('base64url')
const port = Number(process.env.E2E_PORT)

// The test database, as scripts/e2e-server.mjs derives it; tests that check rules inside the
// database itself (the last super administrator) connect to it directly.
if (!process.env.E2E_DATABASE_URL) {
  const fromFile = existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {}
  const base = process.env.DATABASE_URL ?? fromFile.DATABASE_URL
  if (base) {
    const url = new URL(base)
    url.pathname = `${url.pathname}_e2e`
    process.env.E2E_DATABASE_URL = url.toString()
  }
}

const browser = {
  ...devices['Desktop Chrome'],
  // Lets environments with a pre-installed Chromium use it instead of `playwright install`.
  launchOptions: process.env.PW_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PW_CHROMIUM_EXECUTABLE }
    : {},
}

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: browser, testIgnore: /(last-super-admin|site-menu)\.spec\.ts/ },
    // Disables the super administrators of every worker: runs alone, after all other tests.
    {
      name: 'last-super-admin',
      use: browser,
      testMatch: /last-super-admin\.spec\.ts/,
      dependencies: ['chromium'],
    },
    // Changes the website's menu for every page: also after all other tests.
    {
      name: 'site-menu',
      use: browser,
      testMatch: /site-menu\.spec\.ts/,
      dependencies: ['chromium'],
    },
  ],
  webServer: {
    command: 'node scripts/e2e-server.mjs',
    url: `http://127.0.0.1:${port}/`,
    // Always a fresh server: it rebuilds the test database with the current fixtures.
    reuseExistingServer: false,
    timeout: 180_000,
    // In CI the server's own log (Payload, Next.js) goes into the job log for diagnosis.
    stdout: process.env.CI ? 'pipe' : 'ignore',
  },
})
