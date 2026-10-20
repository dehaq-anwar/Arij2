/**
 * Deployment settings read at runtime (not NEXT_PUBLIC_*, which would be frozen into the build,
 * so one Docker image can serve staging and production).
 */
export const siteUrl = () => (process.env.SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')

/** Search engines stay out until launch: placeholder content must not be indexed. */
export const indexingAllowed = () => process.env.ALLOW_INDEXING === 'true'

/**
 * Where the Control Center runs: its own host in production (e.g. https://verwaltung.yop-ye.org,
 * see src/proxy.ts), the website's own address when ADMIN_URL is not set (development).
 */
export const adminUrl = () => (process.env.ADMIN_URL || siteUrl()).replace(/\/$/, '')
