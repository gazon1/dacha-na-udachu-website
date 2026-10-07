/**
 * In-memory rate limiter for booking/RSVP endpoints.
 *
 * Usage:
 *   const limiter = createLimiter({ windowMs: 60_000, max: 10, keyBy: (req) => getIp(req) })
 *   if (!limiter(req)) return Response.json({ error: 'rate_limited' }, { status: 429 })
 *
 * ── Known limitation: state lives in THIS process only ────────────────────
 * The counters are a plain `Map` in module scope, so:
 *   • running more than one instance multiplies the effective limit by the
 *     number of instances (Next.js may fork workers; a scaled `app` service
 *     definitely does);
 *   • any container restart clears every counter, so "flood → wait for a
 *     deploy → flood" is a cheap bypass;
 *   • each instance also runs its own GC interval, so instances multiply that
 *     overhead too.
 *
 * This is bot/spam friction, not an anti-DoS control. That is an acceptable
 * trade for a single-instance site — but it will silently weaken the moment
 * the app is scaled horizontally, and nothing will fail to warn us.
 *
 * Before scaling `app`, move the counter to shared storage: Redis via
 * @upstash/ratelimit, or a Postgres table with an (key, window) unique key.
 * See the deploy notes in the PR that introduced docker-compose healthchecks.
 */

// Minimal shape we need — works for both standard Request and PayloadRequest.
type RequestLike = Pick<Request, 'headers'>

type KeyFn = (req: RequestLike) => string

export type Limiter = {
  check: (req: RequestLike) => boolean
  reset: () => void
}

export function createLimiter(opts: {
  windowMs: number
  max: number
  keyBy: KeyFn
}): Limiter {
  const hits = new Map<string, number[]>()

  // Garbage-collect old entries periodically.
  const gcInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, ts] of hits.entries()) {
      const fresh = ts.filter((t) => now - t < opts.windowMs)
      if (fresh.length === 0) hits.delete(key)
      else hits.set(key, fresh)
    }
  }, opts.windowMs)
  // Don't keep the process alive just for GC.
  if (typeof gcInterval.unref === 'function') gcInterval.unref()

  return {
    check: (req: RequestLike) => {
      const key = opts.keyBy(req)
      const now = Date.now()
      const arr = hits.get(key) ?? []
      const fresh = arr.filter((t) => now - t < opts.windowMs)
      if (fresh.length >= opts.max) {
        hits.set(key, fresh)
        return false
      }
      fresh.push(now)
      hits.set(key, fresh)
      return true
    },
    reset: () => hits.clear(),
  }
}

export function getIp(req: RequestLike): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

// Pre-configured limiters matching the previous django-ratelimit rules.
export const bookingSubmitLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 bookings per IP per hour
  keyBy: getIp,
})

export const rsvpLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyBy: getIp,
})

export const newsletterLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyBy: getIp,
})

export const contributionLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5, // взнос — более редкое действие, чем RSVP/newsletter
  keyBy: getIp,
})