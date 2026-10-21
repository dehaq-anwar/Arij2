import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Integration tests: the Payload Local API against a real PostgreSQL database, created fresh
 * for each test file from the migrations (tests/integration/database.ts).
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(dirname, 'src'), '@ops': path.resolve(dirname, 'ops-agent/src') },
  },
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    // One database per file, files one after the other: predictable and gentle on the server.
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 300_000,
  },
})
