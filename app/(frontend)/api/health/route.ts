import { NextResponse } from 'next/server'

/**
 * Instant health probe — used by Docker HEALTHCHECK.
 *
 * Same path as the old /workspace/frontend/app/api/health/route.ts.
 */
export const dynamic = 'force-static'
export const revalidate = false

export async function GET() {
  return NextResponse.json({ status: 'ok', ts: Date.now() })
}