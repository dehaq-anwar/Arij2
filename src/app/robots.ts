import type { MetadataRoute } from 'next'

import { indexingAllowed, siteUrl } from '@/lib/site'

// Evaluated per request, so ALLOW_INDEXING takes effect without a rebuild.
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  if (!indexingAllowed()) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
