import type { Endpoint, Where } from 'payload'
import { z } from 'zod'
import { rsvpLimiter } from '../../lib/rate-limit'
import {
  findBySecretKey,
  projectRsvp,
  type RsvpStatusDoc,
} from '../../lib/secret-key'

/**
 * RSVP endpoints:
 *   POST /api/event-rsvps/submit   — create RSVP (returns secretKey)
 *   POST /api/event-rsvps/by-secret — owner status lookup (secretKey in body)
 *   POST /api/event-rsvps/cancel    — update/cancel own RSVP (secretKey in body)
 *
 * The secretKey is the only credential for the latter two, and it is
 * deliberately carried in the JSON body, NOT the URL. URLs get written to
 * Caddy access logs, browser history and Referer headers — an unguessable key
 * in a URL is still a key that leaks. Both endpoints are POST, which also means
 * the browser attaches SameSite=Lax protection for free.
 */
const SubmitSchema = z.object({
  event: z.union([z.number(), z.string()]),
  name: z.string().min(1).max(100),
  status: z.enum(['going', 'maybe', 'not_going', 'waiting']).default('going'),
  guestsCount: z.number().int().min(1).max(50).default(1),
  // Honeypot
  website: z.string().max(0).optional(),
})

export const SecretSchema = z.object({
  secretKey: z.string().min(1).max(64),
})

export const CancelSchema = SecretSchema.extend({
  status: z.enum(['not_going', 'going', 'maybe', 'waiting']).default('not_going'),
  // Optional fields — when sent, the existing RSVP is updated in place.
  name: z.string().min(1).max(100).optional(),
  guestsCount: z.number().int().min(1).max(50).optional(),
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
      if (!(await rsvpLimiter.check(req))) {
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

      const filter: Where =
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
    path: '/by-secret',
    method: 'post',
    handler: async (req) => {
      if (!(await rsvpLimiter.check(req))) {
        return Response.json({ error: 'rate_limited' }, { status: 429 })
      }
      const body = await req.json?.().catch(() => ({}))
      const parsed = SecretSchema.safeParse(body)
      if (!parsed.success) {
        return Response.json({ error: 'invalid_input' }, { status: 400 })
      }
      const doc = await findBySecretKey<RsvpStatusDoc>(
        req,
        'event-rsvps',
        parsed.data.secretKey,
      )
      if (!doc) {
        return Response.json({ error: 'not_found' }, { status: 404 })
      }

      // Allow-listed projection — see lib/secret-key.ts. Notably excludes the
      // `user` relationship, which exposes another account's identity.
      return Response.json(projectRsvp(doc))
    },
  },

  {
    path: '/cancel',
    method: 'post',
    handler: async (req) => {
      if (!(await rsvpLimiter.check(req))) {
        return Response.json({ error: 'rate_limited' }, { status: 429 })
      }
      const body = await req.json?.().catch(() => ({}))
      const parsed = CancelSchema.safeParse(body)
      if (!parsed.success) {
        return Response.json(
          { error: 'invalid_input', details: parsed.error.flatten() },
          { status: 400 },
        )
      }
      const rsvp = await findBySecretKey<{ id: string | number }>(
        req,
        'event-rsvps',
        parsed.data.secretKey,
      )
      if (!rsvp) {
        return Response.json({ error: 'not_found' }, { status: 404 })
      }
      const updated = await req.payload.update({
        collection: 'event-rsvps',
        id: rsvp.id,
        req,
        data: {
          status: parsed.data.status,
          ...(parsed.data.name != null ? { name: parsed.data.name } : {}),
          ...(parsed.data.guestsCount != null
            ? { guestsCount: parsed.data.guestsCount }
            : {}),
        },
      })
      return Response.json({ ok: true, rsvp: updated })
    },
  },
]
