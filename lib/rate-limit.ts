/**
 * Postgres-backed rate limiter for booking/RSVP endpoints.
 *
 * Usage:
 *   const limiter = createLimiter({ name: 'booking', windowMs: 60_000, max: 10 })
 *   if (!(await limiter.check(req))) return Response.json({ error: 'rate_limited' }, { status: 429 })
 *
 * ── Why this lives in the database ──────────────────────────────────────────
 * The previous implementation kept counters in a `Map` in module scope. That
 * made the limit a property of the PROCESS, not of the client:
 *   • running N instances gave every client N× the limit;
 *   • any container restart cleared every counter, so "flood → wait for a
 *     deploy → flood" was a cheap bypass;
 *   • each instance also ran its own GC interval.
 * None of that fails loudly — the protection just gets weaker as the app grows,
 * which is the worst time to find out. Sharing the counter through Postgres
 * makes the limit mean the same thing on every instance and across restarts.
 *
 * ── Sliding window, not fixed ───────────────────────────────────────────────
 * `hits` holds the epoch-ms timestamps still inside the window, so the limit is
 * a true sliding window (no 2× burst at a bucket boundary the way a fixed
 * window allows). The array is trimmed in the same statement that appends, so
 * old entries expire as a side effect of ordinary traffic rather than needing a
 * sweeper, and it is capped at `max + 1` entries so a flood cannot grow it
 * without bound.
 *
 * The whole read-modify-write is one INSERT .. ON CONFLICT statement, which
 * takes a row lock for its duration. Two concurrent requests from the same IP
 * therefore cannot both read "count = 2" and both be admitted past a limit of 3
 * — the same race a read-then-write implementation would have.
 */

import { sql } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'
import type { SQLWrapper } from 'drizzle-orm'

// Minimal shape we need — works for both standard Request and PayloadRequest.
// The db handle is typed as Payload's own union of Drizzle handles rather than
// described structurally: it has no single exact signature, and inventing one
// only produces assignability errors at the call sites.
type DbHandle = NonNullable<PayloadRequest['payload']['db']>

/**
 * `payload.db` also includes DrizzleTransaction, whose `execute` takes an
 * already-built argument object rather than a SQL wrapper, so calling through
 * the union directly does not type-check. At request time we always hold the
 * top-level PostgresDB handle, whose `execute` takes a SQL wrapper. Narrow it
 * once here rather than casting at every call.
 */
type Executor = { execute: (query: SQLWrapper) => Promise<unknown> }

type RequestLike = Pick<Request, 'headers'> & {
  payload?: { db?: DbHandle | null } | null
}

export type Limiter = {
  check: (req: RequestLike) => Promise<boolean>
}

/**
 * Deletes rows whose window has fully passed. Best-effort and amortised: if
 * this never runs the table still behaves correctly (expired rows are filtered
 * out on read and overwritten on the next hit), it would only grow.
 */
const SWEEP_INTERVAL_MS = 60_000
let lastSweepAt = 0

export function createLimiter(opts: { name: string; windowMs: number; max: number }): Limiter {
  return {
    check: async (req: RequestLike) => {
      const db = req.payload?.db
      if (!db) {
        // Should not happen for Payload endpoints, but throwing here would turn
        // a missing handle into a 500 on a working endpoint. Fall back to
        // per-process counting and say so loudly, because that fallback has
        // exactly the multi-instance weakness described above.
        if (!warnedAboutFallback) {
          warnedAboutFallback = true
          console.error(
            '[rate-limit] no payload.db on the request — falling back to per-process ' +
              'counting. Limits will be per-instance and reset on restart.',
          )
        }
        return memoryCheck(opts, bucketFor(opts, getIp(req)))
      }

      const now = Date.now()
      const cutoff = now - opts.windowMs
      // Store at most max + 1 so "over the limit" stays observable: with a cap
      // of exactly max, a full window and an overflowing one are identical.
      const cap = opts.max + 1
      const exec = db as unknown as Executor

      // One statement, so the row lock serialises concurrent hits.
      const rows = (await exec.execute(sql`
        WITH upsert AS (
          INSERT INTO "rate_limit_windows" ("bucket", "hits", "expires_at")
          VALUES (
            ${`${opts.name}:${getIp(req)}`},
            ARRAY[${now}]::bigint[],
            to_timestamp(${now} / 1000.0) + (${opts.windowMs} || ' milliseconds')::interval
          )
          ON CONFLICT ("bucket") DO UPDATE SET
            "hits" = (
              SELECT COALESCE(array_agg(y.h), ARRAY[]::bigint[])
              FROM (
                SELECT x.h
                FROM (
                  SELECT h FROM unnest("rate_limit_windows"."hits") AS h
                  WHERE h > ${cutoff}
                  UNION ALL
                  SELECT ${now}::bigint
                ) x(h)
                ORDER BY x.h DESC
                LIMIT ${cap}
              ) y
            ),
            "expires_at" = to_timestamp(${now} / 1000.0)
              + (${opts.windowMs} || ' milliseconds')::interval
          RETURNING "hits"
        )
        SELECT cardinality("hits") AS count FROM upsert
      `)) as { rows?: Array<{ count: number }> } | Array<{ count: number }>

      const count = readCount(rows)

      if (Date.now() - lastSweepAt > SWEEP_INTERVAL_MS) {
        lastSweepAt = Date.now()
        // The cutoff is the app's clock, not now() on the database. expires_at
        // is written from the app's clock too, and the app and the database do
        // not share one — comparing against the server's clock would delete
        // windows that have not expired yet, quietly handing every client its
        // limit back. Same reasoning as `cutoff` above.
        // Fire-and-forget: a failed sweep must not fail the request being
        // rate-limited, and the next one will try again.
        void exec
          .execute(sql`
            DELETE FROM "rate_limit_windows" WHERE "expires_at" < to_timestamp(${now} / 1000.0)
          `)
          .catch((err: unknown) => {
            console.error('[rate-limit] sweep failed:', err)
          })
      }

      return count <= opts.max
    },
  }
}

let warnedAboutFallback = false

/** Drizzle returns rows differently depending on the driver/version. */
function readCount(result: unknown): number {
  const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] })?.rows
  if (!Array.isArray(rows) || rows.length === 0) {
    // A missing count must not read as "under the limit".
    throw new Error('[rate-limit] unexpected result shape from db.execute')
  }
  return Number((rows[0] as { count: number }).count)
}

function bucketFor(opts: { name: string }, key: string): string {
  return `${opts.name}:${key}`
}

export function getIp(req: RequestLike): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

/**
 * Only used when no `payload.db` is reachable — see the warning in `check`.
 * Kept separate so the normal path has no in-process state at all.
 */
const memoryState = new Map<string, { hits: number[]; sweptAt: number }>()

function memoryCheck(opts: { name: string; windowMs: number; max: number }, bucket: string): boolean {
  const now = Date.now()
  const entry = memoryState.get(bucket) ?? { hits: [], sweptAt: now }
  if (now - entry.sweptAt > SWEEP_INTERVAL_MS) {
    entry.hits = []
    entry.sweptAt = now
  }
  entry.hits = entry.hits.filter((t) => now - t < opts.windowMs)
  const over = entry.hits.length >= opts.max
  if (!over) entry.hits.push(now)
  memoryState.set(bucket, entry)
  return !over
}

// Pre-configured limiters matching the previous django-ratelimit rules.
export const bookingSubmitLimiter = createLimiter({
  name: 'booking',
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 bookings per IP per hour
})

export const rsvpLimiter = createLimiter({
  name: 'rsvp',
  windowMs: 60 * 60 * 1000,
  max: 10,
})

export const newsletterLimiter = createLimiter({
  name: 'newsletter',
  windowMs: 60 * 60 * 1000,
  max: 10,
})

export const contributionLimiter = createLimiter({
  name: 'contribution',
  windowMs: 60 * 60 * 1000,
  max: 5, // взнос — более редкое действие, чем RSVP/newsletter
})