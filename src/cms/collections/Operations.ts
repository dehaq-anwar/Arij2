import type { CollectionConfig, GlobalConfig } from 'payload'

import { allow, nobody } from '../access/roles'

/**
 * What the Control Center keeps from the operations agent (src/cms/operations): host samples,
 * the agent's backup, drill and restart history, and the last known state. Written only by the
 * collection job (src/cms/operations/collect.ts) through the Local API; read by the operations
 * screens. None of it holds personal data: counts, sizes, durations, service names.
 */

/** One host sample per minute (CPU, memory, load, disk, database size); kept 30 days. */
export const OpsSamples: CollectionConfig = {
  slug: 'ops-samples',
  admin: { hidden: true },
  access: { read: allow('operations.read'), create: nobody, update: nobody, delete: nobody },
  timestamps: false,
  defaultSort: '-at',
  fields: [
    { name: 'at', type: 'date', required: true, unique: true, index: true },
    { name: 'cpuPercent', type: 'number' },
    { name: 'memoryUsed', type: 'number' },
    { name: 'memoryTotal', type: 'number' },
    { name: 'load1', type: 'number' },
    { name: 'diskUsed', type: 'number' },
    { name: 'diskTotal', type: 'number' },
    { name: 'databaseBytes', type: 'number' },
  ],
}

/** The agent's events (backups, restore drills, restarts), mirrored; kept 12 months. */
export const OpsEvents: CollectionConfig = {
  slug: 'ops-events',
  admin: { hidden: true },
  access: { read: allow('operations.read'), create: nobody, update: nobody, delete: nobody },
  timestamps: false,
  defaultSort: '-startedAt',
  fields: [
    { name: 'eventId', type: 'text', required: true, unique: true },
    {
      name: 'kind',
      type: 'select',
      required: true,
      index: true,
      options: ['backup', 'drill', 'restart'].map((value) => ({ value, label: value })),
    },
    {
      name: 'trigger',
      type: 'select',
      required: true,
      options: ['schedule', 'manual'].map((value) => ({ value, label: value })),
    },
    { name: 'startedAt', type: 'date', required: true, index: true },
    { name: 'finishedAt', type: 'date', required: true },
    { name: 'ok', type: 'checkbox', required: true, defaultValue: false },
    // Counts, sizes, durations, snapshot ids and problems as the agent reports them (masked).
    { name: 'detail', type: 'json' },
  ],
}

/**
 * The last known state: the agent's status, certificates, database figures, when the agent
 * last answered, and the cursors of the collection job. Replaced on every run.
 */
export const OperationsState: GlobalConfig = {
  slug: 'operations-state',
  admin: { hidden: true },
  access: { read: allow('operations.read'), update: nobody },
  fields: [
    { name: 'lastContactAt', type: 'date' },
    { name: 'lastAttemptAt', type: 'date' },
    { name: 'lastError', type: 'text' },
    { name: 'failingSince', type: 'date' },
    { name: 'lastSampleAt', type: 'date' },
    { name: 'lastEventAt', type: 'text' },
    { name: 'status', type: 'json' },
    { name: 'certificates', type: 'json' },
    { name: 'certificatesCheckedAt', type: 'date' },
    { name: 'database', type: 'json' },
    { name: 'accessCollectedUntil', type: 'date' },
  ],
}
