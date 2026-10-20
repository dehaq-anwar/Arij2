import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload, TaskConfig } from 'payload'

import { audit } from '../audit/log'

/**
 * How long the audit log and the export register are kept: 12 months as decided by the
 * association on 2026-10-20 (initial setting; to be reviewed legally before going live).
 * Adjustable on the server with AUDIT_RETENTION_MONTHS (whole months, 1–120), deliberately not
 * in the interface: shortening it would delete records of what people did.
 */
export const DEFAULT_AUDIT_RETENTION_MONTHS = 12

export function auditRetentionMonths(value = process.env.AUDIT_RETENTION_MONTHS): number {
  const months = Number(value)
  return Number.isInteger(months) && months >= 1 && months <= 120
    ? months
    : DEFAULT_AUDIT_RETENTION_MONTHS
}

/**
 * Deletes audit and export entries older than the retention period. Both tables refuse every
 * UPDATE, DELETE and TRUNCATE in the database itself; the only exception is this purge, which
 * sets a flag for its own transaction, and even then the database deletes only rows older than
 * the period (the trigger checks the age itself). One entry records the purge.
 */
export async function purgeAuditTrail(payload: Payload, months = auditRetentionMonths()) {
  const { drizzle } = payload.db as unknown as PostgresAdapter
  const counts = await drizzle.transaction(async (tx) => {
    await tx.execute(sql`select set_config('yop.retention_purge', 'on', true)`)
    await tx.execute(sql`select set_config('yop.retention_months', ${String(months)}, true)`)
    const age = sql`now() - make_interval(months => ${months})`
    const auditRows = await tx.execute(
      sql`delete from audit_log where created_at < ${age} returning id`,
    )
    const exportRows = await tx.execute(
      sql`delete from exports where created_at < ${age} returning id`,
    )
    return { auditLog: auditRows.rows.length, exports: exportRows.rows.length }
  })
  if (counts.auditLog || counts.exports) {
    await audit(payload, {
      action: 'audit.purged',
      area: 'security',
      actor: null,
      detail: { months, ...counts },
    })
  }
  return counts
}

/** Every night at 03:30 (server time). */
export const auditRetentionTask: TaskConfig = {
  slug: 'audit-retention',
  label: 'Delete audit and export entries past the retention period',
  schedule: [{ cron: '30 3 * * *', queue: 'maintenance' }],
  retries: 2,
  outputSchema: [
    { name: 'auditLog', type: 'number' },
    { name: 'exports', type: 'number' },
  ],
  handler: async ({ req }) => {
    const output = await purgeAuditTrail(req.payload)
    req.payload.logger.info({ ...output }, 'Audit retention: old entries deleted')
    return { output }
  },
}
