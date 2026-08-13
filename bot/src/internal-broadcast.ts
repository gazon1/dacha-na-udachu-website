import express from 'express'
import type { Bot, Context } from 'grammy'
import { config } from './config'
import { broadcastEvent } from './utils/notify'

/**
 * Internal HTTP endpoint, который вызывает app через колллекцию Events
 * afterChange. Защищён shared INTERNAL_API_SECRET — снаружи не exposed.
 *
 * Один Express-сервер на BOT_PORT (3001) обслуживает:
 *   POST /webhook                  — Telegram (внешний, через Caddy)
 *   POST /internal/broadcast-event — app (внутри Docker network)
 *   GET  /healthz                  — Docker healthcheck
 */
export function mountInternalBroadcast<C extends Context = Context>(
  app: express.Express,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bot: any,
): void {
  app.post('/internal/broadcast-event', async (req, res) => {
    if (!config.INTERNAL_API_SECRET) {
      return res.status(503).json({ error: 'broadcast_disabled' })
    }
    if (req.headers['x-internal-secret'] !== config.INTERNAL_API_SECRET) {
      return res.status(401).json({ error: 'unauthorized' })
    }

    const { eventId, title, slug, startDate } = req.body as {
      eventId?: string | number
      title?: string
      slug?: string
      startDate?: string
    }
    if (!eventId || !title || !slug || !startDate) {
      return res.status(400).json({ error: 'missing_fields' })
    }

    try {
      const result = await broadcastEvent(bot, eventId, title, slug, startDate)
      console.log(
        `[broadcast] event ${eventId} sent=${result.sent} failed=${result.failed}`,
      )
      return res.json({ ok: true, ...result })
    } catch (err) {
      console.error('[broadcast] error:', err)
      return res.status(500).json({ error: 'broadcast_failed' })
    }
  })
}
