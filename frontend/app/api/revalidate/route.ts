import { revalidatePath, revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

/**
 * On-demand revalidation webhook called by Wagtail when a page is published,
 * unpublished, moved, or deleted. See /workspace/backend/dacha/signals.py.
 *
 * Accepts any combination of query params:
 *   path=<route path>     — calls revalidatePath(path)
 *   tag=<cache tag>       — calls revalidateTag(tag, { expire: 0 })
 *   id=<wagtail page id>  — calls revalidateTag("wagtail:page:<id>", { expire: 0 })
 *
 * Auth: shared secret via X-Revalidate-Secret header (preferred) or ?secret=
 * query param (fallback for clients that can't set headers, like some
 * webhook providers). If REVALIDATE_SECRET env var is unset, all requests
 * are rejected (fail-closed).
 *
 * Cache behaviour: we pass `{ expire: 0 }` as the second arg to
 * revalidateTag, per the Next.js docs recommendation for webhooks:
 * "This pattern is necessary when external systems call your Route Handlers
 *  and require data to expire immediately."
 */

// ---------- Auth ----------

/** Constant-time string compare. Avoids leaking length / position info via timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) return false; // fail-closed: missing secret → reject everything
  const provided =
    req.headers.get("x-revalidate-secret") ??
    req.nextUrl.searchParams.get("secret") ??
    "";
  return timingSafeEqual(provided, expected);
}

// ---------- Helpers ----------

/** Strip trailing slash for revalidatePath (docs say it's not required, but
 *  normalising means Wagtail's `/houses/` and Next's `/houses` are equivalent). */
function normalisePath(p: string): string {
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p;
}

// ---------- Handlers ----------

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return Response.json(
      { revalidated: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const path = sp.get("path");
  const tag = sp.get("tag");
  const id = sp.get("id");

  if (!path && !tag && !id) {
    return Response.json(
      { revalidated: false, error: "missing path|tag|id" },
      { status: 400 }
    );
  }

  try {
    if (path) revalidatePath(normalisePath(path));
    if (tag) revalidateTag(tag, { expire: 0 });
    if (id) revalidateTag(`wagtail:page:${id}`, { expire: 0 });
    return Response.json({
      revalidated: true,
      path: path ?? null,
      tag: tag ?? null,
      id: id ?? null,
      now: Date.now(),
    });
  } catch (err) {
    // Don't 500 — Wagtail wouldn't retry, and the editor's publish already
    // succeeded server-side. Surface the error in JSON so operators can see it.
    return Response.json(
      { revalidated: false, error: String(err) },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  return handle(req);
}

// GET is the verb the Next.js docs use in their own example, and is also
// handy for one-liner curl debugging. Same handler, same auth.
export async function GET(req: NextRequest) {
  return handle(req);
}