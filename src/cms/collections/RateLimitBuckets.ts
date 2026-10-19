import type { CollectionConfig } from 'payload'

import { nobody } from '../access/roles'

/**
 * Counters for the rate limiter (src/lib/forms/rate-limit.ts). The key is an HMAC of the client
 * address with a secret that exists only in memory and changes daily: raw addresses are never
 * stored and cannot be recovered from the key. Expired rows are deleted by the retention job.
 */
export const RateLimitBuckets: CollectionConfig = {
  slug: 'rate-limit-buckets',
  admin: { hidden: true },
  access: { create: nobody, read: nobody, update: nobody, delete: nobody },
  timestamps: false,
  fields: [
    { name: 'key', type: 'text', required: true, unique: true },
    { name: 'count', type: 'number', required: true, defaultValue: 0 },
    { name: 'expiresAt', type: 'date', required: true, index: true },
  ],
}
