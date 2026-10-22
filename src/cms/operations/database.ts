import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

/**
 * Database figures for the operations screens (docs/CONTROL-CENTER.md §3.6), read through the
 * app's own connection: size, connections, server version and the largest tables by size.
 * Sizes only — no row counts or contents.
 */
export type DatabaseFigures = {
  checkedAt: string
  bytes: number
  connections: number
  maxConnections: number
  version: string
  tables: { name: string; bytes: number }[]
}

type Row = Record<string, unknown>

export async function databaseFigures(
  payload: Payload,
  now = new Date(),
): Promise<DatabaseFigures> {
  const db = (payload.db as unknown as PostgresAdapter).drizzle
  const [overview, tables] = await Promise.all([
    db.execute(sql`
      select pg_database_size(current_database()) as bytes,
        (select count(*) from pg_stat_activity where datname = current_database()) as connections,
        current_setting('max_connections')::int as max_connections,
        current_setting('server_version') as version
    `),
    db.execute(sql`
      select c.relname as name, pg_total_relation_size(c.oid) as bytes
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
      order by pg_total_relation_size(c.oid) desc
      limit 8
    `),
  ])
  const row = ((overview as { rows: Row[] }).rows[0] ?? {}) as Row
  return {
    checkedAt: now.toISOString(),
    bytes: Number(row.bytes) || 0,
    connections: Number(row.connections) || 0,
    maxConnections: Number(row.max_connections) || 0,
    version: String(row.version ?? ''),
    tables: (tables as { rows: Row[] }).rows.map((t) => ({
      name: String(t.name),
      bytes: Number(t.bytes) || 0,
    })),
  }
}
