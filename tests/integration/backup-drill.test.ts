import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { Client } from 'pg'
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { startPayload } from './database'

/**
 * Backup and restore drill with the real operations agent image (ops-agent/Dockerfile): a fresh,
 * migrated database with content, a nightly-style backup into a new restic repository, then the
 * drill — restore into a separate database, compare every table's row count, the newest
 * migration and the protective triggers, list the media backup and read the whole repository
 * back. CI builds the image first (OPS_AGENT_IMAGE); the test needs Docker.
 */
const image = process.env.OPS_AGENT_IMAGE ?? 'yop-ops-agent:test'
const dockerReady =
  spawnSync('docker', ['image', 'inspect', image], { stdio: 'ignore' }).status === 0

let payload: Payload
let stop: () => Promise<void>
let url = ''

beforeAll(async () => {
  if (!dockerReady) return
  const started = await startPayload('backup')
  payload = started.payload
  stop = started.stop
  url = started.url
  // Some content and association data, so that the counts mean something.
  for (const title of ['Erster Beitrag', 'Zweiter Beitrag']) {
    await payload.create({
      collection: 'news',
      data: { title, excerpt: 'Kurz.', _status: 'published' } as never,
      context: { disableRevalidate: true },
    })
  }
})

afterAll(async () => stop?.())

type Event = {
  kind: string
  ok: boolean
  detail: Record<string, unknown> & { problems?: string[] }
}

function agent(command: string, repository: string, media: string, drillDatabase: string) {
  const result = spawnSync(
    'docker',
    [
      'run',
      '--rm',
      '--network',
      'host',
      '-v',
      `${repository}:/repo`,
      '-v',
      `${media}:/media:ro`,
      '-e',
      `OPS_AGENT_SECRET=${'t'.repeat(40)}`,
      '-e',
      'RESTIC_REPOSITORY=/repo',
      '-e',
      'RESTIC_PASSWORD=integration-only',
      '-e',
      `BACKUP_DATABASE_URL=${url}`,
      '-e',
      'BACKUP_MEDIA=path',
      '-e',
      'BACKUP_MEDIA_PATH=/media',
      '-e',
      `DRILL_DATABASE=${drillDatabase}`,
      image,
      'node',
      'src/cli.ts',
      command,
    ],
    { encoding: 'utf8', timeout: 300_000 },
  )
  const events = result.stdout
    .split('\n')
    .filter((line) => line.startsWith('{'))
    .map((line) => JSON.parse(line) as Event)
  return { code: result.status, events, stderr: result.stderr }
}

describe.skipIf(!dockerReady)('backup and restore drill', () => {
  it('backs up the database and media and restores the database exactly', async () => {
    const repository = mkdtempSync(path.join(os.tmpdir(), 'yop-restic-'))
    const media = mkdtempSync(path.join(os.tmpdir(), 'yop-media-'))
    // The agent runs as an unprivileged user (uid 1000).
    chmodSync(repository, 0o777)
    chmodSync(media, 0o755)
    writeFileSync(path.join(media, 'bild.webp'), Buffer.alloc(1024, 1))
    writeFileSync(path.join(media, 'bild-480x320.webp'), Buffer.alloc(512, 2))
    const drillDatabase = `yop_it_drill_${process.pid}`

    const { code, events, stderr } = agent('verify', repository, media, drillDatabase)
    expect(stderr).not.toMatch(/integration-only|password/i)
    const [backup, drill] = events
    expect(backup, JSON.stringify(events)).toMatchObject({ kind: 'backup', ok: true })
    expect(backup!.detail.repositoryCreated).toBe(true)
    expect(backup!.detail.database).toMatchObject({ tables: expect.any(Number) })
    expect((backup!.detail.database as { tables: number }).tables).toBeGreaterThan(40)
    expect(backup!.detail.media).toMatchObject({ files: 2 })
    expect(drill, JSON.stringify(drill?.detail)).toMatchObject({ kind: 'drill', ok: true })
    expect(drill!.detail.problems).toEqual([])
    expect(drill!.detail.tablesCompared).toBe(
      (backup!.detail.database as { tables: number }).tables,
    )
    expect(drill!.detail.rowsCompared).toBe((backup!.detail.database as { rows: number }).rows)
    expect(drill!.detail.mediaFiles).toBe(2)
    expect(drill!.detail.repositoryCheck).toBe('ok')
    expect(code).toBe(0)

    // The drill leaves no copy of the data behind.
    const maintenance = new URL(url)
    maintenance.pathname = '/postgres'
    const client = new Client({ connectionString: maintenance.toString() })
    await client.connect()
    const { rows } = await client.query('select 1 from pg_database where datname = $1', [
      drillDatabase,
    ])
    await client.end()
    expect(rows).toHaveLength(0)

    // The repository is encrypted: no table name or content is readable in its files.
    const plain = spawnSync('grep', ['-rl', 'payload_migrations', repository], { encoding: 'utf8' })
    expect(plain.stdout.trim()).toBe('')
  })
})
