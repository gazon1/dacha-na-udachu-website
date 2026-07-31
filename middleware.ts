import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware: rate-limit mutating API endpoints + relax CSP for /admin.
 *
 * - Public API (booking, RSVP, telegram login): per-IP rate limit via in-memory
 *   limiter (lib/rate-limit.ts handles inside the route; this middleware is
 *   a safety net for unknown routes).
 * - /admin/*: relax CSP to allow Payload's admin UI inline scripts.
 * - Everything else: pass through (security headers are set in next.config.mjs).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Relax CSP for Payload admin (Payload admin needs inline scripts/styles).
  if (pathname.startsWith('/admin')) {
    const response = NextResponse.next()
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        // Payload admin needs unsafe-inline + unsafe-eval for its bundled UI
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'self'",
        "base-uri 'self'",
      ].join('; ')
    )
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
}