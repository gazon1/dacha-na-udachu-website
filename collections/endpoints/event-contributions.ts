import type { Endpoint, Where } from 'payload'
import { z } from 'zod'
import { contributionLimiter } from '../../lib/rate-limit'
import {
  buildQuickpayUrl,
  exchangeCodeForToken,
  getAuthorizeUrl,
  getOperationHistory,
  getOperationDetails,
  getYoomoneyConfig,
  verifyWebhookSignature,
} from '../../lib/yoomoney'

/**
 * In-process rate-limit: last timestamp (ms) we called getOperationHistory for
 * a given secretKey.  Used by /check-by-secret to debounce rapid button presses.
 */
const lastCheckMap = new Map<string, number>()

/**
 * Event contribution endpoints:
 *
 *   POST   /api/event-contributions/submit              — create pending contribution
 *   GET    /api/event-contributions/summary/:eventSlug  — public confirmed list + total
 *   GET    /api/event-contributions/by-secret/:secretKey— admin/debug lookup
 *   POST   /api/event-contributions/check-payments      — cron fallback
 *   GET    /api/event-contributions/yoomoney-auth       — initiate OAuth
 *   GET    /api/event-contributions/yoomoney-callback   — finish OAuth, show token
 *   POST   /api/event-contributions/yoomoney-notification — YooMoney webhook
 */

const SubmitSchema = z.object({
  event: z.union([z.number(), z.string()]),
  name: z.string().min(1).max(100),
  amount: z.number().int().min(1).max(1_000_000),
  message: z.string().max(200).optional(),
  // Honeypot — bots fill this; we silently drop the submission.
  website: z.string().max(0).optional(),
})

function randomUUID(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'c' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export const eventContributionEndpoints: Endpoint[] = [
  // ─── POST /submit ────────────────────────────────────────────────────────
  {
    path: '/submit',
    method: 'post',
    handler: async (req) => {
      if (!contributionLimiter.check(req)) {
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

      // Honeypot — pretend success but don't create anything.
      if (parsed.data.website) {
        return Response.json({ ok: true, paymentUrl: '/dummy' })
      }

      const cfg = getYoomoneyConfig()
      if (!cfg) {
        return Response.json(
          { error: 'yoomoney_not_configured' },
          { status: 503 },
        )
      }

      const { event, name, amount, message } = parsed.data

      // Resolve event by id or slug.
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
      const eventDoc = eventRes.docs[0] as { id: number; title: string; slug: string } | undefined
      if (!eventDoc) {
        return Response.json({ error: 'event_not_found' }, { status: 404 })
      }

      const secretKey = randomUUID()
      const created = await req.payload.create({
        collection: 'event-contributions',
        req,
        data: {
          event: eventDoc.id,
          name,
          amount,
          message,
          secretKey,
          status: 'pending',
        },
      })

      const paymentUrl = buildQuickpayUrl(cfg.wallet, {
        sum: amount,
        label: secretKey,
        targets: `Взнос на ${eventDoc.title}`.slice(0, 150),
        paymentType: 'AC',
        successUrl: `${cfg.redirectUri.replace('/yoomoney-callback', '')}/events/${eventDoc.slug}`,
      })

      const res = Response.json({
        ok: true,
        id: created.id,
        secretKey,
        paymentUrl,
      })
      res.headers.append(
        'Set-Cookie',
        `contrib-${eventDoc.id}=${secretKey}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`,
      )
      return res
    },
  },

  // ─── GET /summary/:eventSlug ────────────────────────────────────────────
  {
    path: '/summary/:eventSlug',
    method: 'get',
    handler: async (req) => {
      const slug = (req.routeParams as { eventSlug?: string })?.eventSlug
      if (!slug) {
        return Response.json({ error: 'missing_slug' }, { status: 400 })
      }

      const eventRes = await req.payload.find({
        collection: 'events',
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      const eventDoc = eventRes.docs[0] as
        | { id: string | number; contributionGoal?: number | null }
        | undefined
      if (!eventDoc) {
        return Response.json({ error: 'event_not_found' }, { status: 404 })
      }

      const contribsRes = await req.payload.find({
        collection: 'event-contributions',
        where: {
          event: { equals: eventDoc.id },
          status: { equals: 'confirmed' },
        },
        sort: '-confirmedAt',
        limit: 500,
        depth: 0,
        overrideAccess: true,
      })

      type Confirmed = {
        id: string | number
        name: string
        amount: number
        message?: string | null
        confirmedAt?: string | null
      }
      const contributions = (contribsRes.docs as Confirmed[]).map((c) => ({
        name: c.name,
        amount: c.amount,
        message: c.message ?? null,
        confirmedAt: c.confirmedAt ?? null,
      }))

      const total = contributions.reduce((s, c) => s + c.amount, 0)

      return Response.json({
        ok: true,
        total,
        goal: typeof eventDoc.contributionGoal === 'number' ? eventDoc.contributionGoal : null,
        contributions,
      })
    },
  },

  // ─── GET /by-secret/:secretKey ───────────────────────────────────────────
  {
    path: '/by-secret/:secretKey',
    method: 'get',
    handler: async (req) => {
      const secretKey = (req.routeParams as { secretKey?: string })?.secretKey
      if (!secretKey) {
        return Response.json({ error: 'missing_secret' }, { status: 400 })
      }
      const res = await req.payload.find({
        collection: 'event-contributions',
        where: { secretKey: { equals: secretKey } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (!res.docs[0]) {
        return Response.json({ error: 'not_found' }, { status: 404 })
      }
      return Response.json(res.docs[0])
    },
  },

  // ─── POST /check-by-secret (Telegram bot: "я перевёл — проверить") ───────
  {
    path: '/check-by-secret',
    method: 'post',
    handler: async (req) => {
      // Short-circuit if YooMoney not configured.
      const token = process.env.YOOMONEY_ACCESS_TOKEN
      if (!token) {
        return Response.json({ ok: false, reason: 'no_token' }, { status: 503 })
      }

      const body = await req.json?.().catch(() => ({}))
      const parsed = z.object({ secretKey: z.string().min(1) }).safeParse(body)
      if (!parsed.success) {
        return Response.json({ ok: false, reason: 'invalid_input' }, { status: 400 })
      }
      const { secretKey } = parsed.data

      // Simple in-process rate-limit: don't hammer YooMoney more than once per
      // 10 seconds per secretKey.  Using a module-level Map — fine for single-
      // process; resets on deploy/restart.
      const now = Date.now()
      const lastChecked = lastCheckMap.get(secretKey)
      if (lastChecked !== undefined && now - lastChecked < 10_000) {
        return Response.json(
          { ok: false, reason: 'too_soon', retryAfterMs: 10_000 - (now - lastChecked) },
          { status: 429 },
        )
      }

      // Find the contribution.
      const findRes = await req.payload.find({
        collection: 'event-contributions',
        where: { secretKey: { equals: secretKey } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      type Contrib = {
        id: number | string
        amount: number
        status: string
        createdAt: string
      }
      const doc = findRes.docs[0] as Contrib | undefined
      if (!doc) {
        return Response.json({ ok: false, reason: 'not_found' }, { status: 404 })
      }

      // If already in a terminal state, skip the API call.
      if (doc.status === 'confirmed' || doc.status === 'rejected') {
        return Response.json({ ok: true, status: doc.status })
      }

      // Mark as checked now (before the API call so concurrent clicks are debounced).
      lastCheckMap.set(secretKey, now)

      try {
        const ops = await getOperationHistory(token, {
          label: secretKey,
          from: new Date(doc.createdAt),
        })
        const match = ops.find(
          (op) => op.status === 'success' && op.amount === doc.amount,
        )

        if (match) {
          // Fetch details to get sender name if available.
          let senderFirstname: string | undefined
          let senderLastname: string | undefined
          try {
            const details = await getOperationDetails(token, match.operation_id)
            if (details?.details) {
              // The comment field may contain free text; sender name is preferred.
              // YooMoney webhook populates sender name via bank-level data.
              senderFirstname = undefined // populated via webhook in production; details.extra may be empty
              senderLastname = undefined
            }
          } catch {
            // non-fatal — proceed without sender name
          }

          await req.payload.update({
            collection: 'event-contributions',
            id: doc.id,
            data: {
              status: 'confirmed',
              yoomoneyOperationId: match.operation_id,
              confirmedAt: new Date().toISOString(),
              senderFirstname,
              senderLastname,
            },
            overrideAccess: true,
          })
          return Response.json({ ok: true, status: 'confirmed' })
        }

        // Pending — no matching successful transfer found.
        return Response.json({ ok: true, status: 'pending' })
      } catch (err) {
        req.payload.logger.error({ err, secretKey }, 'check_by_secret_yoomoney_failed')
        return Response.json({ ok: false, reason: 'api_error' }, { status: 502 })
      }
    },
  },

  // ─── POST /check-payments (cron fallback) ───────────────────────────────
  {
    path: '/check-payments',
    method: 'post',
    handler: async (req) => {
      const cronSecret = process.env.CRON_SECRET
      if (!cronSecret) {
        return Response.json({ error: 'cron_not_configured' }, { status: 503 })
      }
      const headerSecret = req.headers.get('x-cron-secret')
      if (headerSecret !== cronSecret) {
        return Response.json({ error: 'unauthorized' }, { status: 401 })
      }

      const token = process.env.YOOMONEY_ACCESS_TOKEN
      if (!token) {
        return Response.json({ error: 'no_token' }, { status: 503 })
      }

      const pending = await req.payload.find({
        collection: 'event-contributions',
        where: { status: { equals: 'pending' } },
        limit: 500,
        depth: 0,
        overrideAccess: true,
      })

      type Pending = {
        id: string | number
        secretKey: string
        amount: number
        createdAt: string
      }

      let processed = 0
      let confirmed = 0
      for (const raw of pending.docs as Pending[]) {
        processed++
        try {
          const ops = await getOperationHistory(token, {
            label: raw.secretKey,
            from: new Date(raw.createdAt),
          })
          const match = ops.find((op) => op.status === 'success' && op.amount === raw.amount)
          if (match) {
            await req.payload.update({
              collection: 'event-contributions',
              id: raw.id,
              data: {
                status: 'confirmed',
                yoomoneyOperationId: match.operation_id,
                confirmedAt: new Date().toISOString(),
              },
              overrideAccess: true,
            })
            confirmed++
          }
        } catch (err) {
          // Don't abort the whole batch on a single API hiccup.
          req.payload.logger.error({ err, id: raw.id }, 'yoomoney_check_failed')
        }
      }

      return Response.json({ ok: true, processed, confirmed })
    },
  },

  // ─── GET /yoomoney-auth ──────────────────────────────────────────────────
  {
    path: '/yoomoney-auth',
    method: 'get',
    handler: async () => {
      const cfg = getYoomoneyConfig()
      if (!cfg) {
        return Response.json({ error: 'yoomoney_not_configured' }, { status: 503 })
      }
      const url = getAuthorizeUrl(cfg)
      return Response.redirect(url, 302)
    },
  },

  // ─── GET /yoomoney-callback ──────────────────────────────────────────────
  {
    path: '/yoomoney-callback',
    method: 'get',
    handler: async (req) => {
      const url = new URL(req.url || 'http://localhost', 'http://localhost')
      const code = url.searchParams.get('code')
      if (!code) {
        return new Response(
          `<html><body><h1>Ошибка</h1><p>Не получен authorization code.</p></body></html>`,
          { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        )
      }
      const cfg = getYoomoneyConfig()
      if (!cfg) {
        return new Response('yoomoney_not_configured', { status: 503 })
      }
      try {
        const token = await exchangeCodeForToken(cfg, code)
        // Return the token as plain HTML for manual copy into .env.
        // Show only once — never log the token.
        return new Response(
          `<!doctype html><html><head><meta charset="utf-8"><title>ЮMoney токен</title></head>
<body style="font-family:system-ui;max-width:640px;margin:2rem auto;padding:0 1rem">
<h1>Токен получен</h1>
<p>Скопируйте значение ниже и добавьте в <code>.env</code> как <code>YOOMONEY_ACCESS_TOKEN</code>.</p>
<p style="background:#f4f4f5;padding:1rem;border-radius:.5rem;word-break:break-all;font-family:monospace">${token}</p>
<p><strong>Важно:</strong> перезапустите сервер после обновления <code>.env</code>.</p>
<p><a href="/admin">В админку</a></p>
</body></html>`,
          { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        )
      } catch (err) {
        req.payload.logger.error({ err }, 'yoomoney_token_exchange_failed')
        return new Response('token_exchange_failed', { status: 500 })
      }
    },
  },

  // ─── POST /yoomoney-notification ─────────────────────────────────────────
  {
    path: '/yoomoney-notification',
    method: 'post',
    handler: async (req) => {
      const secret = process.env.YOOMONEY_NOTIFICATION_SECRET
      if (!secret) {
        return Response.json({ error: 'not_configured' }, { status: 503 })
      }

      // Read both form-encoded and JSON bodies — YooMoney sends form-encoded.
      const rawText = await req.text?.().catch(() => '')
      const body: Record<string, string> = {}
      if (rawText) {
        const params = new URLSearchParams(rawText)
        for (const [k, v] of params) body[k] = v
      }
      // Fallback: try JSON
      if (Object.keys(body).length === 0) {
        try {
          Object.assign(body, await req.json?.())
        } catch {
          // ignore
        }
      }

      const ok = await verifyWebhookSignature(body, secret)
      if (!ok) {
        return Response.json({ error: 'bad_signature' }, { status: 403 })
      }

      const notificationType = body.notification_type
      const codepro = body.codepro === 'true'
      const testNotification = body.test_notification === 'true'
      const unaccepted = body.unaccepted === 'true'
      const label = body.label
      const amountStr = body.amount
      const operationId = body.operation_id
      const firstname = body.firstname ?? null
      const lastname = body.lastname ?? null

      // Only handle real incoming transfers.
      if (notificationType !== 'p2p-incoming' && notificationType !== 'card-incoming') {
        return Response.json({ ok: true, skipped: 'unknown_type' })
      }
      if (codepro || unaccepted) {
        return Response.json({ ok: true, skipped: 'frozen_or_protected' })
      }
      if (testNotification) {
        return Response.json({ ok: true, skipped: 'test_notification' })
      }
      if (!label || !amountStr || !operationId) {
        return Response.json({ ok: true, skipped: 'missing_fields' })
      }

      const amount = Number(amountStr)
      if (!Number.isFinite(amount)) {
        return Response.json({ ok: true, skipped: 'bad_amount' })
      }

      const match = await req.payload.find({
        collection: 'event-contributions',
        where: { secretKey: { equals: label } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })

      const doc = match.docs[0] as
        | {
            id: string | number
            amount: number
            status: string
          }
        | undefined

      if (!doc) {
        // Stray transfer to our wallet that doesn't match any pending contribution.
        // YooMoney retries up to 3 times — we must always return 200 OK to stop retries.
        return Response.json({ ok: true, skipped: 'no_matching_contribution' })
      }
      if (doc.status === 'confirmed') {
        return Response.json({ ok: true, skipped: 'already_confirmed' })
      }

      if (doc.amount !== amount) {
        await req.payload.update({
          collection: 'event-contributions',
          id: doc.id,
          data: { status: 'rejected' },
          overrideAccess: true,
        })
        req.payload.logger.warn(
          { id: doc.id, expected: doc.amount, got: amount },
          'yoomoney_amount_mismatch',
        )
        return Response.json({ ok: true, rejected: 'amount_mismatch' })
      }

      await req.payload.update({
        collection: 'event-contributions',
        id: doc.id,
        data: {
          status: 'confirmed',
          yoomoneyOperationId: operationId,
          confirmedAt: new Date().toISOString(),
          senderFirstname: firstname || undefined,
          senderLastname: lastname || undefined,
        },
        overrideAccess: true,
      })

      return Response.json({ ok: true, confirmed: doc.id })
    },
  },
]