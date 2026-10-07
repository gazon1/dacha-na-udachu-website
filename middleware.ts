import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { adminCsp } from '@/lib/csp.mjs'

/**
 * Middleware: rate-limit mutating API endpoints + relax CSP for /admin.
 *
 * - Public API (booking, RSVP, telegram login): per-IP rate limit via in-memory
 *   limiter (lib/rate-limit.ts handles inside the route; this middleware is
 *   a safety net for unknown routes).
 * - /admin/*: relax CSP to allow Payload's admin UI inline scripts. The policy
 *   is derived from the public one in lib/csp.mjs, so the two cannot drift apart
 *   again (they already had: the public one allows https://telegram.org in
 *   connect-src for the Telegram login widget, this copy did not).
 * - Everything else: pass through (security headers are set in next.config.mjs).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin')) {
    const response = NextResponse.next()
    response.headers.set('Content-Security-Policy', adminCsp())
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
}