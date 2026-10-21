import { mkdir } from 'node:fs/promises'

import type { AgentConfig } from './config.ts'
import { lastLines, pgEnv, PsqlSession, psql, run, runOk, ToolError } from './run.ts'
import type { AgentEvent, SnapshotMeta, StateStore } from './state.ts'

/**
 * Backups (docs/CONTROL-CENTER.md §8): the database as a pg_dump in custom format and the media
 * files, both into one restic repository (encrypted; EU storage with object lock in production,
 * decision 9). The row counts of every table are taken inside the same database snapshot as the
 * dump, so the restore drill can compare them exactly.
 */
export const HOST_TAG = 'yop'

export const STATS_SQL = `
select 'table|' || table_name || '|' || (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text
  from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE';
select 'trigger|' || tgname from pg_trigger where not tgisinternal;
select 'migration|' || coalesce((select name from payload_migrations order by id desc limit 1), '')
  where to_regclass('public.payload_migrations') is not null;
`

export type DatabaseStats = {
  tables: Record<string, number>
  triggers: string[]
  migration: string | null
}

export function parseStats(lines: string[]): DatabaseStats {
  const stats: DatabaseStats = { tables: {}, triggers: [], migration: null }
  for (const line of lines) {
    const [kind, name, value] = line.split('|')
    if (kind === 'table' && name) stats.tables[name] = Number(value) || 0
    else if (kind === 'trigger' && name) stats.triggers.push(name)
    else if (kind === 'migration') stats.migration = name || null
  }
  stats.triggers.sort()
  return stats
}

export const resticEnv = (config: AgentConfig): NodeJS.ProcessEnv => ({
  ...process.env,
  RESTIC_CACHE_DIR: process.env.RESTIC_CACHE_DIR || `${config.stateDir}/restic-cache`,
})

/** The repository's summary line of a `--json` backup. */
export function snapshotOf(output: string): { id: string; files: number; bytes: number } | null {
  for (const line of output.split('\n').reverse()) {
    if (!line.startsWith('{')) continue
    try {
      const message = JSON.parse(line) as {
        message_type?: string
        snapshot_id?: string
        total_files_processed?: number
        total_bytes_processed?: number
      }
      if (message.message_type === 'summary' && message.snapshot_id) {
        return {
          id: message.snapshot_id,
          files: message.total_files_processed ?? 0,
          bytes: message.total_bytes_processed ?? 0,
        }
      }
    } catch {
      // Progress lines and others.
    }
  }
  return null
}

/** Creates the repository the first time; any other error is reported. */
export async function ensureRepository(config: AgentConfig) {
  const env = resticEnv(config)
  const probe = await run(config.bin.restic, ['cat', 'config'], { env, timeoutMs: 120_000 })
  if (probe.code === 0) return { created: false }
  if (
    !/does not exist|unable to open config|Is there a repository|no such file/i.test(probe.stderr)
  ) {
    throw new ToolError('restic', probe.code, probe.stderr)
  }
  await runOk(config.bin.restic, ['init'], { env, timeoutMs: 120_000 })
  return { created: true }
}

function s3Env(base: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    ...base,
    RCLONE_CONFIG_MEDIA_TYPE: 's3',
    RCLONE_CONFIG_MEDIA_PROVIDER: base.S3_PROVIDER || 'Other',
    RCLONE_CONFIG_MEDIA_ACCESS_KEY_ID: base.S3_ACCESS_KEY_ID ?? '',
    RCLONE_CONFIG_MEDIA_SECRET_ACCESS_KEY: base.S3_SECRET_ACCESS_KEY ?? '',
    RCLONE_CONFIG_MEDIA_ENDPOINT: base.S3_ENDPOINT ?? '',
    RCLONE_CONFIG_MEDIA_REGION: base.S3_REGION ?? '',
    RCLONE_CONFIG_MEDIA_FORCE_PATH_STYLE: base.S3_FORCE_PATH_STYLE === 'true' ? 'true' : 'false',
  }
}

async function backupMedia(config: AgentConfig) {
  if (config.backup.media === 'none') return null
  const env = resticEnv(config)
  let path = config.backup.mediaPath
  if (config.backup.media === 's3') {
    const bucket = process.env.S3_BUCKET
    if (!bucket) throw new Error('S3_BUCKET is not set')
    path = config.backup.mediaMirror
    await mkdir(path, { recursive: true })
    await runOk(config.bin.rclone, ['sync', `media:${bucket}`, path, '--fast-list', '--quiet'], {
      env: s3Env(process.env),
      timeoutMs: 2 * 60 * 60 * 1000,
    })
  }
  if (!path) throw new Error('BACKUP_MEDIA_PATH is not set')
  const result = await runOk(
    config.bin.restic,
    ['backup', path, '--host', HOST_TAG, '--tag', HOST_TAG, '--tag', 'media', '--json'],
    { env, timeoutMs: 2 * 60 * 60 * 1000 },
  )
  const snapshot = snapshotOf(result.stdout)
  if (!snapshot) throw new Error('restic reported no media snapshot')
  return snapshot
}

/** The nightly (or manual) backup. Never throws: the result is an event. */
export async function runBackup(
  config: AgentConfig,
  state: StateStore,
  trigger: AgentEvent['trigger'],
): Promise<AgentEvent> {
  const startedAt = new Date()
  const detail: Record<string, unknown> = {}
  let ok = false
  let session: PsqlSession | null = null
  try {
    if (!config.backup.databaseUrl) throw new Error('BACKUP_DATABASE_URL is not set')
    if (!config.backup.repositoryConfigured)
      throw new Error('RESTIC_REPOSITORY / RESTIC_PASSWORD are not set')
    const repository = await ensureRepository(config)
    if (repository.created) detail.repositoryCreated = true

    // One transaction, one snapshot: the counts and the dump see exactly the same data.
    const db = pgEnv(config.backup.databaseUrl)
    session = new PsqlSession(config.bin.psql, db)
    await session.query('begin isolation level repeatable read read only;')
    const [exported] = await session.query('select pg_export_snapshot();')
    if (!exported) throw new Error('no database snapshot')
    const stats = parseStats(await session.query(STATS_SQL))
    const dumpStarted = Date.now()
    const result = await runOk(
      config.bin.restic,
      [
        'backup',
        '--host',
        HOST_TAG,
        '--tag',
        HOST_TAG,
        '--tag',
        'db',
        '--json',
        '--stdin-filename',
        'database.dump',
        '--stdin-from-command',
        '--',
        config.bin.pgDump,
        `--snapshot=${exported}`,
        '--format=custom',
        '--compress=0',
        '--no-owner',
        '--no-acl',
      ],
      { env: { ...resticEnv(config), ...db }, timeoutMs: 2 * 60 * 60 * 1000 },
    )
    await session.query('commit;')
    await session.close()
    session = null
    const snapshot = snapshotOf(result.stdout)
    if (!snapshot) throw new Error('restic reported no database snapshot')
    detail.database = {
      snapshotId: snapshot.id,
      bytes: snapshot.bytes,
      tables: Object.keys(stats.tables).length,
      rows: Object.values(stats.tables).reduce((sum, n) => sum + n, 0),
      seconds: Math.round((Date.now() - dumpStarted) / 1000),
    }

    const mediaStarted = Date.now()
    const media = await backupMedia(config)
    if (media) {
      detail.media = {
        snapshotId: media.id,
        files: media.files,
        bytes: media.bytes,
        seconds: Math.round((Date.now() - mediaStarted) / 1000),
      }
    }
    const meta: SnapshotMeta = {
      snapshotId: snapshot.id,
      takenAt: startedAt.toISOString(),
      tables: stats.tables,
      migration: stats.migration,
      triggers: stats.triggers,
      mediaSnapshotId: media?.id ?? null,
      mediaFiles: media?.files ?? null,
    }
    await state.remember(meta)

    if (config.backup.prune) {
      const keep = config.backup.keep
      const pruned = await run(
        config.bin.restic,
        [
          'forget',
          '--host',
          HOST_TAG,
          '--tag',
          HOST_TAG,
          '--keep-daily',
          String(keep.daily),
          '--keep-weekly',
          String(keep.weekly),
          '--keep-monthly',
          String(keep.monthly),
          '--prune',
        ],
        { env: resticEnv(config), timeoutMs: 2 * 60 * 60 * 1000 },
      )
      // With object lock, locked data cannot be removed yet; the backup itself still counts.
      detail.retention =
        pruned.code === 0 ? 'applied' : `not applied: ${lastLines(pruned.stderr, 1)}`
    }
    ok = true
  } catch (error) {
    detail.error =
      error instanceof ToolError ? error.message : String((error as Error).message ?? error)
  } finally {
    if (session) await session.close().catch(() => undefined)
  }
  return state.record({
    kind: 'backup',
    trigger,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    ok,
    detail,
  })
}

/** The repository's snapshots, newest first (for the Control Center). */
export async function listSnapshots(config: AgentConfig) {
  if (!config.backup.repositoryConfigured) return []
  const result = await runOk(
    config.bin.restic,
    ['snapshots', '--host', HOST_TAG, '--tag', HOST_TAG, '--json'],
    { env: resticEnv(config), timeoutMs: 120_000 },
  )
  const snapshots = JSON.parse(result.stdout || '[]') as {
    id: string
    short_id?: string
    time: string
    tags?: string[]
    summary?: { total_files_processed?: number; total_bytes_processed?: number }
  }[]
  return snapshots
    .map((s) => ({
      id: s.id,
      shortId: s.short_id ?? s.id.slice(0, 8),
      time: s.time,
      kind: s.tags?.includes('media') ? 'media' : 'db',
      files: s.summary?.total_files_processed ?? null,
      bytes: s.summary?.total_bytes_processed ?? null,
    }))
    .sort((a, b) => b.time.localeCompare(a.time))
}

export { psql }
