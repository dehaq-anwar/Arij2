import { HOST_TAG, parseStats, resticEnv, STATS_SQL } from './backup.ts'
import type { AgentConfig } from './config.ts'
import { lastLines, pgEnv, pipe, psql, run, runOk, ToolError } from './run.ts'
import type { AgentEvent, SnapshotMeta, StateStore } from './state.ts'

/**
 * The automatic restore drill (docs/CONTROL-CENTER.md §8): the newest database backup is
 * restored into a separate, fresh database and checked against what the backup recorded — every
 * table, its exact row count, the newest migration and the database's own protections (the
 * append-only audit log, the last super administrator). The media backup is listed and counted,
 * and a sample of the repository's data is read back. The drill database is removed afterwards,
 * so no second copy of personal data stays on the server.
 */
export type DrillComparison = { problems: string[]; tablesCompared: number; rowsCompared: number }

export function compareWithBackup(
  meta: Pick<SnapshotMeta, 'tables' | 'migration' | 'triggers'>,
  restored: { tables: Record<string, number>; triggers: string[]; migration: string | null },
): DrillComparison {
  const problems: string[] = []
  let rows = 0
  for (const [table, count] of Object.entries(meta.tables)) {
    const got = restored.tables[table]
    if (got === undefined) problems.push(`table missing: ${table}`)
    else if (got !== count) problems.push(`rows in ${table}: ${got} instead of ${count}`)
    else rows += count
  }
  for (const table of Object.keys(restored.tables)) {
    if (!(table in meta.tables)) problems.push(`unexpected table: ${table}`)
  }
  for (const trigger of meta.triggers) {
    if (!restored.triggers.includes(trigger)) problems.push(`trigger missing: ${trigger}`)
  }
  if (meta.migration !== restored.migration) {
    problems.push(
      `newest migration: ${restored.migration ?? 'none'} instead of ${meta.migration ?? 'none'}`,
    )
  }
  return { problems, tablesCompared: Object.keys(meta.tables).length, rowsCompared: rows }
}

/** The database's own protections (migrations CC-0 and CC-1); a restore must bring them back. */
export const PROTECTIONS = [
  'audit_log_no_truncate',
  'audit_log_no_update_or_delete',
  'exports_no_truncate',
  'exports_no_update_or_delete',
  'users_keep_super_admin',
]

const quote = (name: string) => `"${name.replace(/"/g, '""')}"`

async function latest(config: AgentConfig, tag: 'db' | 'media') {
  const result = await runOk(
    config.bin.restic,
    ['snapshots', '--host', HOST_TAG, '--tag', `${HOST_TAG},${tag}`, '--latest', '1', '--json'],
    { env: resticEnv(config), timeoutMs: 120_000 },
  )
  const list = JSON.parse(result.stdout || '[]') as { id: string; time: string }[]
  return list.sort((a, b) => b.time.localeCompare(a.time))[0] ?? null
}

export async function runDrill(
  config: AgentConfig,
  state: StateStore,
  trigger: AgentEvent['trigger'],
  options: { readDataSubset?: string } = {},
): Promise<AgentEvent> {
  const startedAt = new Date()
  const detail: Record<string, unknown> = {}
  let ok = false
  const admin = config.backup.drillAdminUrl ? pgEnv(config.backup.drillAdminUrl) : null
  const target = config.backup.drillDatabase
  let created = false
  try {
    if (!config.backup.repositoryConfigured)
      throw new Error('RESTIC_REPOSITORY / RESTIC_PASSWORD are not set')
    if (!admin) throw new Error('No database connection for the drill (BACKUP_DATABASE_URL)')
    const snapshot = await latest(config, 'db')
    if (!snapshot) throw new Error('No database backup yet')
    detail.snapshotId = snapshot.id
    detail.snapshotTime = snapshot.time
    detail.ageHours = Math.round((startedAt.getTime() - new Date(snapshot.time).getTime()) / 36e5)

    await psql(config.bin.psql, admin, `drop database if exists ${quote(target)} with (force);`)
    await psql(config.bin.psql, admin, `create database ${quote(target)};`)
    created = true
    const restoreStarted = Date.now()
    const drillEnv = { ...admin, PGDATABASE: target }
    await pipe(
      [config.bin.restic, ['dump', snapshot.id, '/database.dump'], resticEnv(config)],
      [
        config.bin.pgRestore,
        ['--no-owner', '--no-acl', '--exit-on-error', '--dbname', target],
        drillEnv,
      ],
    )
    detail.restoreSeconds = Math.round((Date.now() - restoreStarted) / 1000)

    const restored = parseStats(await psql(config.bin.psql, drillEnv, STATS_SQL))
    const meta = state.snapshot(snapshot.id)
    const problems: string[] = []
    if (meta) {
      const comparison = compareWithBackup(meta, restored)
      problems.push(...comparison.problems)
      detail.tablesCompared = comparison.tablesCompared
      detail.rowsCompared = comparison.rowsCompared
    } else {
      // A backup this agent did not record (e.g. from before a reinstall): structure only.
      detail.comparedWith = 'structure only'
      if (Object.keys(restored.tables).length === 0) problems.push('no tables restored')
      for (const trigger of PROTECTIONS) {
        if (!restored.triggers.includes(trigger)) problems.push(`trigger missing: ${trigger}`)
      }
    }
    detail.tables = Object.keys(restored.tables).length
    detail.triggers = restored.triggers.length
    detail.migration = restored.migration

    if (config.backup.media !== 'none') {
      const media = await latest(config, 'media')
      if (!media) problems.push('no media backup')
      else {
        const listed = await runOk(config.bin.restic, ['ls', media.id, '--json'], {
          env: resticEnv(config),
          timeoutMs: 600_000,
        })
        const files = listed.stdout
          .split('\n')
          .filter((line) => line.includes('"type":"file"')).length
        detail.mediaFiles = files
        const expected = meta?.mediaSnapshotId === media.id ? meta.mediaFiles : null
        if (expected !== null && expected !== undefined && files !== expected) {
          problems.push(`media files: ${files} instead of ${expected}`)
        }
      }
    }

    // Reads back part of the stored data to prove the repository itself is intact.
    const check = await run(
      config.bin.restic,
      ['check', `--read-data-subset=${options.readDataSubset ?? '5%'}`],
      { env: resticEnv(config), timeoutMs: 2 * 60 * 60 * 1000 },
    )
    detail.repositoryCheck = check.code === 0 ? 'ok' : lastLines(check.stderr || check.stdout, 2)
    if (check.code !== 0) problems.push('repository check failed')

    detail.problems = problems
    ok = problems.length === 0
  } catch (error) {
    detail.error =
      error instanceof ToolError ? error.message : String((error as Error).message ?? error)
  } finally {
    if (created && admin) {
      await psql(
        config.bin.psql,
        admin,
        `drop database if exists ${quote(target)} with (force);`,
      ).catch(() => (detail.cleanup = 'drill database could not be removed'))
    }
  }
  return state.record({
    kind: 'drill',
    trigger,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    ok,
    detail,
  })
}
