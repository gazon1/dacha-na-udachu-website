import { NextResponse } from "next/server";

/**
 * Instant health probe — used by Docker HEALTHCHECK.
 *
 * Must NOT hit Wagtail, the DB, or any external service: cold-start failures
 * must be attributable to Next.js itself, not downstream dependencies. If this
 * route is slow, the issue is the Next.js process, not the data pipeline.
 */
export const dynamic = "force-static";
export const revalidate = false;

export async function GET() {
  return NextResponse.json({ status: "ok", ts: Date.now() });
}