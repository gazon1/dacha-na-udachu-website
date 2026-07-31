import type { Endpoint } from 'payload'
import { z } from 'zod'
import { newsletterLimiter } from '../../lib/rate-limit'

/**
 * Newsletter endpoints — POST /api/newsletter-signups/subscribe.
 */
const SubscribeSchema = z.object({
  email: z.string().email().max(255),
  // Honeypot
  website: z.string().max(0).optional(),
})

export const newsletterEndpoints: Endpoint[] = [
  {
    path: '/subscribe',
    method: 'post',
    handler: async (req) => {
      if (!newsletterLimiter.check(req)) {
        return Response.json({ error: 'rate_limited' }, { status: 429 })
      }
      const body = await req.json?.().catch(() => ({}))
      const parsed = SubscribeSchema.safeParse(body)
      if (!parsed.success) {
        return Response.json(
          { error: 'invalid_email', details: parsed.error.flatten() },
          { status: 400 },
        )
      }
      if (parsed.data.website) {
        return Response.json({ ok: true })
      }
      const { email } = parsed.data
      // Fetch IP from forwarded headers for abuse tracking.
      const xff = req.headers.get('x-forwarded-for')
      const ipAddress = (xff ? xff.split(',')[0] : req.headers.get('x-real-ip')) || undefined

      // De-dupe: if already subscribed, just return ok.
      const existing = await req.payload.find({
        collection: 'newsletter-signups',
        where: { email: { equals: email } },
        limit: 1,
        depth: 0,
      })
      if (existing.docs[0]) {
        return Response.json({ ok: true, alreadySubscribed: true })
      }
      await req.payload.create({
        collection: 'newsletter-signups',
        req,
        data: {
          email,
          subscribedAt: new Date().toISOString(),
          isActive: true,
          ...(ipAddress ? { ipAddress } : {}),
        },
      })
      return Response.json({ ok: true }, { status: 201 })
    },
  },
]
