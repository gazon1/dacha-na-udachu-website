import type { Endpoint } from 'payload'

import {
  exchangeCodeForToken,
  getAuthorizeUrl,
  getYoomoneyConfig,
  verifyWebhookSignature,
} from '../../lib/yoomoney'

/**
 * YooMoney integration endpoints, split out of event-contributions.ts:
 *
 *   GET  /api/event-contributions/yoomoney-auth         — start OAuth
 *   GET  /api/event-contributions/yoomoney-callback     — finish OAuth, show token
 *   POST /api/event-contributions/yoomoney-notification — inbound webhook
 *
 * The webhook is the security-critical one: it verifies an HMAC-SHA256
 * signature over the POST fields (see verifyWebhookSignature, covered by
 * tests/yoomoney-webhook.test.ts) and must answer 200 even for transfers
 * that match nothing — YooMoney retries 3 times and then gives up.
 */
export const yoomoneyEndpoints: Endpoint[] = [
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
