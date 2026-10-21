/**
 * Which host serves what (docs/CONTROL-CENTER.md §3.3). With ADMIN_URL set, the Control Center
 * (Payload's admin and its API) answers only on that host, and the public website only on the
 * others: on the public host /admin and /api do not exist (404), except the media files the
 * website shows. Without ADMIN_URL (local development) everything runs on one host.
 *
 * Optionally the reverse proxy proves that a request came through its admin site block (where
 * further protection such as an IP allowlist applies) by sending ADMIN_GATE_SECRET in the
 * `x-admin-gate` header; then admin-host requests without it are refused as well.
 */
export type HostDecision =
  | { kind: 'admin' }
  | { kind: 'site' }
  | { kind: 'notFound' }
  | { kind: 'redirect'; location: string }

export type HostRequest = {
  host: string | null
  method: string
  pathname: string
  search: string
  gate: string | null
}

export type HostSettings = { adminUrl?: string; siteUrl?: string; gateSecret?: string }

const isAdminPath = (path: string) => path === '/admin' || path.startsWith('/admin/')
/**
 * The live preview of drafts (src/app/(frontend)/[locale]/preview): a website page, but served
 * only on the Control Center's host, next to the editor that shows it.
 */
export const isPreviewPath = (path: string) => /^\/(?:(?:en|ar)\/)?preview(?:\/|$)/.test(path)
const isApiPath = (path: string) => path === '/api' || path.startsWith('/api/')
/** The only part of the API the website itself uses: its images and files. */
const isPublicFile = (method: string, path: string) =>
  (method === 'GET' || method === 'HEAD') && path.startsWith('/api/media/file/')

function equalStrings(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function decideHost(request: HostRequest, settings: HostSettings): HostDecision {
  const { pathname: path, method } = request
  if (!settings.adminUrl) return { kind: 'site' }
  const adminHost = new URL(settings.adminUrl).host
  const onAdminHost = request.host?.toLowerCase() === adminHost.toLowerCase()

  if (onAdminHost) {
    if (settings.gateSecret && !(request.gate && equalStrings(request.gate, settings.gateSecret))) {
      return { kind: 'notFound' }
    }
    if (isAdminPath(path) || isApiPath(path) || path.startsWith('/_next/')) return { kind: 'admin' }
    if (isPreviewPath(path)) return { kind: 'site' }
    if (path === '/') return { kind: 'redirect', location: '/admin' }
    // Website pages are not served on the admin host.
    if (settings.siteUrl) {
      return {
        kind: 'redirect',
        location: `${settings.siteUrl.replace(/\/$/, '')}${path}${request.search}`,
      }
    }
    return { kind: 'notFound' }
  }

  if (isAdminPath(path) || isPreviewPath(path)) return { kind: 'notFound' }
  if (isApiPath(path)) return isPublicFile(method, path) ? { kind: 'admin' } : { kind: 'notFound' }
  return { kind: 'site' }
}
