import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'

import { routing } from './i18n/routing'
import { decideHost } from './lib/admin-host'

const intl = createMiddleware(routing)

/** Website pages get next-intl's locale handling; files and Payload's routes do not. */
const isPage = (path: string) =>
  !path.startsWith('/api') &&
  !path.startsWith('/admin') &&
  !path.startsWith('/_next') &&
  !path.startsWith('/_vercel') &&
  !/\.[^/]+$/.test(path)

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const decision = decideHost(
    {
      host: request.headers.get('host'),
      method: request.method,
      pathname,
      search,
      gate: request.headers.get('x-admin-gate'),
    },
    {
      adminUrl: process.env.ADMIN_URL,
      siteUrl: process.env.SERVER_URL,
      gateSecret: process.env.ADMIN_GATE_SECRET,
    },
  )
  switch (decision.kind) {
    case 'notFound':
      return new NextResponse('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      })
    case 'redirect':
      return NextResponse.redirect(new URL(decision.location, request.url), 308)
    case 'admin':
      return NextResponse.next()
    case 'site':
      return isPage(pathname) ? intl(request) : NextResponse.next()
  }
}

export const config = {
  // Everything except Next.js' static build files: the host rules also cover /admin and /api.
  matcher: ['/((?!_next/static|_next/image).*)'],
}
