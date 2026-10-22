import type { SanitizedConfig } from 'payload'

import { nobody } from './roles'

/**
 * Payload adds the global `payload-jobs-stats` when tasks have a schedule. It records when each
 * scheduled task was last queued, and Payload reads and writes it straight through the database
 * adapter. Payload gives it the default access, though: anyone signed in could change it through
 * the API (/api/globals/payload-jobs-stats) and so keep the retention and deletion tasks from
 * being scheduled. Nobody needs it through the API, so it is closed.
 */
export function withClosedInternals(config: SanitizedConfig): SanitizedConfig {
  for (const global of config.globals) {
    if (global.slug !== 'payload-jobs-stats') continue
    global.access = { ...global.access, read: nobody, readVersions: nobody, update: nobody }
  }
  return config
}
