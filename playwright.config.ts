import { randomBytes } from 'node:crypto'

import { defineConfig, devices } from '@playwright/test'

// Set once in the main process; the web server (which creates the test editor account) and
// the test workers inherit both values.
process.env.E2E_PORT ??= '3100'
process.env.E2E_EDITOR_PASSWORD ??= randomBytes(24).toString('base64url')
const port = Number(process.env.E2E_PORT)

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
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Lets environments with a pre-installed Chromium use it instead of `playwright install`.
        launchOptions: process.env.PW_CHROMIUM_EXECUTABLE
          ? { executablePath: process.env.PW_CHROMIUM_EXECUTABLE }
          : {},
      },
    },
  ],
  webServer: {
    command: 'node scripts/e2e-server.mjs',
    url: `http://127.0.0.1:${port}/`,
    // Always a fresh server: it rebuilds the test database with the current fixtures.
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
