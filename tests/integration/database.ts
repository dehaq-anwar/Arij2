import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parseEnv } from 'node:util'

import { Client } from 'pg'
import type { Payload } from 'payload'

/**
 * A fresh database for one test file: created next to the end-to-end database (or the one in
 * .env), migrated with the committed migrations, dropped afterwards. The Payload config reads
 * DATABASE_URL when it is imported, so it is imported only after the URL is set.
 */
function baseUrl() {
  const fromFile = existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {}
  const url = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL ?? fromFile.DATABASE_URL
  if (!url) throw new Error('Integration tests need E2E_DATABASE_URL or DATABASE_URL')
  return { url, secret: process.env.PAYLOAD_SECRET ?? fromFile.PAYLOAD_SECRET }
}

async function admin(url: URL, sql: string) {
  const maintenance = new URL(url)
  maintenance.pathname = '/postgres'
  const client = new Client({ connectionString: maintenance.toString() })
  await client.connect()
  try {
    return (await client.query(sql)).rows as { datname?: string }[]
  } finally {
    await client.end()
  }
}

export async function startPayload(
  name: string,
): Promise<{ payload: Payload; stop: () => Promise<void>; url: string }> {
  const base = baseUrl()
  const url = new URL(base.url)
  const database = `yop_it_${name}_${process.pid}`
  url.pathname = `/${database}`
  // Databases left behind by an interrupted earlier run of this file.
  const stale = await admin(
    url,
    `SELECT datname FROM pg_database WHERE datname LIKE 'yop_it_${name}_%'`,
  )
  for (const { datname } of stale) {
    await admin(url, `DROP DATABASE IF EXISTS "${datname}" WITH (FORCE)`)
  }
  await admin(url, `CREATE DATABASE "${database}"`)

  process.env.DATABASE_URL = url.toString()
  process.env.PAYLOAD_SECRET = base.secret || 'integration-tests-only'
  process.env.MEDIA_DIR = mkdtempSync(path.join(os.tmpdir(), 'yop-it-media-'))
  delete process.env.S3_BUCKET
  delete process.env.MEMBERSHIP_CONSOLIDATION

  const [{ getPayload }, { default: config }, { migrations }] = await Promise.all([
    import('payload'),
    import('@/payload.config'),
    import('@/migrations'),
  ])
  const payload = await getPayload({ config })
  // The committed migrations, as `payload migrate` runs them.
  await payload.db.migrate({ migrations: migrations as never })
  return {
    payload,
    url: url.toString(),
    stop: async () => {
      // Payload's adapter keeps its connection pool open (its destroy() does not close it).
      // Dropping the database ends those connections; their errors are expected here.
      const pool = (
        payload.db as unknown as {
          pool?: { on: (event: 'error', listener: () => void) => void; _clients?: unknown[] }
        }
      ).pool
      pool?.on('error', () => {})
      for (const client of pool?._clients ?? []) {
        ;(client as { on: (event: 'error', listener: () => void) => void }).on('error', () => {})
      }
      await admin(url, `DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`)
    },
  }
}
