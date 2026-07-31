import type { Endpoint } from 'payload'
import { z } from 'zod'
import { rsvpLimiter } from '../../lib/rate-limit'

/**
 * RSVP endpoints — POST /api/event-rsvps/submit, /cancel/:secretKey, GET /api/event-rsvps/by-secret/:secretKey.
 */
const SubmitSchema = z.object({
  event: z.union([z.number(), z.string()]),
  name: z.string().min(1).max(100),
  status: z.enum(['going', 'maybe', 'not_going', 'waiting']).default('going'),
  guestsCount: z.number().int().min(1).max(50).default(1),
  // Honeypot
  website: z.string().max(0).optional(),
})

const CancelSchema = z.object({
  status: z.enum(['not_going', 'going', 'maybe', 'waiting']).default('not_going'),
})

function randomUUID(): string {
  // Node 19+ and modern browsers have crypto.randomUUID.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // Fallback (should not be hit in Node 20+).
  return 'r' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export const eventsRsvpEndpoints: Endpoint[] = [
  {
    path: '/submit',
    method: 'post',
    handler: async (req) => {
      if (!rsvpLimiter.check(req)) {
        return Response.json({ error: 'rate_limited' }, { status: 429 })
      }
      const body = await req.json?.().catch(() => ({}))
      const parsed = SubmitSchema.safeParse(body)
      if (!parsed.success) {
        return Response.json(
          { error: 'invalid_input', details: parsed.error.flatten() },
          { status: 400 },
        )
      }
      if (parsed.data.website) {
        return Response.json({ ok: true })
      }
      const { event, name, status, guestsCount } = parsed.data

      const filter =
        typeof event === 'number'
          ? { id: { equals: event } }
          : { slug: { equals: String(event) } }
      const eventRes = await req.payload.find({
        collection: 'events',
        where: filter,
        limit: 1,
        depth: 0,
      })
      const eventDoc = eventRes.docs[0]
      if (!eventDoc) {
        return Response.json({ error: 'event_not_found' }, { status: 404 })
      }

      const secretKey = randomUUID()
      const created = await req.payload.create({
        collection: 'event-rsvps',
        req,
        data: {
          event: eventDoc.id,
          name,
          status,
          guestsCount,
          secretKey,
        },
      })

      // Best-effort: set a cookie with the secretKey so the user can cancel later.
      const res = Response.json({
        ok: true,
        id: created.id,
        secretKey,
      })
      res.headers.append(
        'Set-Cookie',
        `rsvp-${eventDoc.id}=${secretKey}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`,
      )
      return res
    },
  },

  {
    path: '/by-secret/:secretKey',
    method: 'get',
    handler: async (req) => {
      const secretKey = (req.routeParams as { secretKey?: string })?.secretKey
      if (!secretKey) {
        return Response.json({ error: 'missing_secret' }, { status: 400 })
      }
      const rsvp = await req.payload.find({
        collection: 'event-rsvps',
        where: { secretKey: { equals: secretKey } },
        limit: 1,
        depth: 0,
      })
      if (!rsvp.docs[0]) {
        return Response.json({ error: 'not_found' }, { status: 404 })
      }
      return Response.json(rsvp.docs[0])
    },
  },

  {
    path: '/cancel/:secretKey',
    method: 'post',
    handler: async (req) => {
      const secretKey = (req.routeParams as { secretKey?: string })?.secretKey
      if (!secretKey) {
        return Response.json({ error: 'missing_secret' }, { status: 400 })
      }
      const body = await req.json?.().catch(() => ({}))
      const parsed = CancelSchema.safeParse(body)
      if (!parsed.success) {
        return Response.json(
          { error: 'invalid_input', details: parsed.error.flatten() },
          { status: 400 },
        )
      }
      const rsvp = await req.payload.find({
        collection: 'event-rsvps',
        where: { secretKey: { equals: secretKey } },
        limit: 1,
        depth: 0,
      })
      if (!rsvp.docs[0]) {
        return Response.json({ error: 'not_found' }, { status: 404 })
      }
      const updated = await req.payload.update({
        collection: 'event-rsvps',
        id: rsvp.docs[0].id,
        req,
        data: { status: parsed.data.status },
      })
      return Response.json({ ok: true, rsvp: updated })
    },
  },
]
