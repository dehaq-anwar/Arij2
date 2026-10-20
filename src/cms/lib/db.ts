import type { PostgresAdapter } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'

type Drizzle = PostgresAdapter['drizzle']

/**
 * The database connection of the request's transaction (Payload opens one for every change),
 * so that raw statements — an advisory lock, for example — belong to the same transaction.
 */
export async function requestDb(req: PayloadRequest): Promise<Drizzle> {
  const adapter = req.payload.db as unknown as PostgresAdapter & {
    sessions?: Record<string, { db: Drizzle } | undefined>
  }
  const id = req.transactionID ? await req.transactionID : null
  return (id != null && adapter.sessions?.[String(id)]?.db) || adapter.drizzle
}

/**
 * Advisory lock key for changes that could leave the Control Center without an active super
 * administrator. The database trigger `users_keep_super_admin` takes the same lock.
 */
export const SUPER_ADMIN_LOCK = 4_242_001
