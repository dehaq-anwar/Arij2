/**
 * Deployment settings read at runtime (not NEXT_PUBLIC_*, which would be frozen into the build,
 * so one Docker image can serve staging and production).
 */
export const siteUrl = () => (process.env.SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')

/** Search engines stay out until launch: placeholder content must not be indexed. */
export const indexingAllowed = () => process.env.ALLOW_INDEXING === 'true'
