import { NextResponse } from 'next/server'

/**
 * Instant health probe — used by Docker HEALTHCHECK.
 *
 * Same path as the old /workspace/frontend/app/api/health/route.ts.
 *
 * Must stay dynamic. With `force-static` + `revalidate: false` Next baked the
 * response into the build output and served it with
 * `cache-control: s-maxage=31536000`, so `ts` froze at build time and both the
 * container healthcheck and the deploy smoke test passed on a response the app
 * never produced — a dead app would still have reported "ok" forever.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ status: 'ok', ts: Date.now() })
}