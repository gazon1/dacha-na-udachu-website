/**
 * In-memory rate limiter for booking/RSVP endpoints.
 *
 * Replaces django-ratelimit per-IP/per-field rules. Sufficient for a single
 * Node.js process; for multi-instance deploys swap in @upstash/ratelimit (Redis).
 *
 * Usage:
 *   const limiter = createLimiter({ windowMs: 60_000, max: 10, keyBy: (req) => getIp(req) })
 *   if (!limiter(req)) return Response.json({ error: 'rate_limited' }, { status: 429 })
 */

type KeyFn = (req: Request) => string

export type Limiter = {
  check: (req: Request) => boolean
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
    check: (req: Request) => {
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

export function getIp(req: Request): string {
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