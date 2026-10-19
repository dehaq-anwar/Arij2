import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const development = process.env.NODE_ENV !== 'production'

/**
 * Only our own origin: fonts, images and scripts are self-hosted and there are no embeds.
 * 'unsafe-inline' scripts are needed by Next.js for static pages (a nonce would force every page
 * to render per request; plan §11). The development server additionally needs eval and its
 * websocket. TLS upgrades and HSTS preloading are left to the reverse proxy and to a later
 * decision.
 */
export const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${development ? ' ws: wss:' : ''}`,
  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

export const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
]

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // Don't write AGENTS.md / CLAUDE.md into the repository on `next dev`.
  agentRules: false,
  reactStrictMode: true,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // The CMS is never indexed, whatever ALLOW_INDEXING says for the website.
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ]
  },
  experimental: {
    // Pages rendered from the CMS are cached in memory only: the production container's file
    // system is read-only. After a restart each page is rendered again on its first visit.
    isrFlushToDisk: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    localPatterns: [{ pathname: '/api/media/file/**' }],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false })
