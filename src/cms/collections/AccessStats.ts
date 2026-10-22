import type { CollectionConfig } from 'payload'

import { allow, nobody } from '../access/roles'

/**
 * Visitor statistics per hour (docs/CONTROL-CENTER.md §7), counted by the operations agent from
 * the website's access log and stored by the job `analytics-collect`: views, visits (entries
 * from outside), bots, 404 and 5xx, and per page, language, referring site (host only), 404
 * address and error address. Counts only: no IP address, no browser string, no cookie, no
 * personal profile. Kept 13 months (proposal), so a year can be compared with the last.
 */
export const AccessStats: CollectionConfig = {
  slug: 'access-stats',
  admin: { hidden: true },
  access: { read: allow('analytics.read'), create: nobody, update: nobody, delete: nobody },
  timestamps: false,
  defaultSort: '-hour',
  fields: [
    { name: 'hour', type: 'date', required: true, unique: true, index: true },
    { name: 'requests', type: 'number', required: true, defaultValue: 0 },
    { name: 'views', type: 'number', required: true, defaultValue: 0 },
    { name: 'entrances', type: 'number', required: true, defaultValue: 0 },
    { name: 'bots', type: 'number', required: true, defaultValue: 0 },
    { name: 'notFound', type: 'number', required: true, defaultValue: 0 },
    { name: 'serverErrors', type: 'number', required: true, defaultValue: 0 },
    // [{ path, locale, views, entrances }], [{ host, entrances }], [{ path, count }],
    // [{ path, status, count }] — as the agent counts them (ops-agent/src/access-log.ts).
    { name: 'pages', type: 'json' },
    { name: 'referrers', type: 'json' },
    { name: 'notFoundPaths', type: 'json' },
    { name: 'errors', type: 'json' },
  ],
}
