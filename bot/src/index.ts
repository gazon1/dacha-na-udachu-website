import express from 'express'
import { Bot, session } from 'grammy'
import { webhookCallback } from 'grammy/web'

import { config, useWebhook } from './config'
import { getBotPayload } from './db'
import type { BotContext, SessionData } from './session'
import { sessionMiddleware } from './middlewares/session'
import { loggerMiddleware } from './middlewares/logger'
import { createProxiedFetch } from './telegram-fetch'

import { handleStart } from './handlers/start'
import { handleHelp } from './handlers/help'
import { handleMe } from './handlers/me'
import { handleEventsList, handleEventOpen } from './handlers/events'
import { handleRsvpCallback } from './handlers/rsvp'
import {
  handleContributeStart,
  handleAmountPreset,
  handleAmountCustom,
  handleCancel,
} from './handlers/contribution'
import { handleSubscribe, handleUnsubscribe } from './handlers/subscribe'
import { handleUnknown } from './handlers/unknown'
import { mountInternalBroadcast } from './internal-broadcast'

/**
 * Entry point. Создаёт Bot + Express, регистрирует middleware и handlers,
 * поднимает webhook или polling.
 */

async function main() {
  console.log(`[bot] starting, mode=${useWebhook ? 'webhook' : 'long-polling'}`)

  // Инициализируем Payload заранее — если БД недоступна, лучше упасть сейчас.
  await getBotPayload()

  // SOCKS5 proxy — только для запросов к api.telegram.org. Если env не задан,
  // используется нативный fetch (без прокси). Все остальные запросы в боте
  // (Payload Local API к Postgres, internal HTTP broadcast между app и bot)
  // идут напрямую через Docker network.
  const botOptions = process.env.TELEGRAM_SOCKS5_PROXY
    ? {
        client: {
          apiRoot: 'https://api.telegram.org',
          fetch: createProxiedFetch(process.env.TELEGRAM_SOCKS5_PROXY),
        },
      }
    : {}

  const bot = new Bot<BotContext>(config.TELEGRAM_BOT_TOKEN, botOptions)

  // Persistent session (in-memory). grammY хранит по ctx.chatId.
  // Для single-instance бота достаточно. Для масштабирования —
  // @grammyjs/storage-files или Redis.
  bot.use(
    session<SessionData, BotContext>({
      initial: () => ({
        telegramId: '',
        userId: null,
        role: null,
        firstName: null,
        username: null,
      }),
    }),
  )

  bot.use(sessionMiddleware)
  bot.use(loggerMiddleware)

  // ----- Commands -----
  bot.command('start', handleStart)
  bot.command('help', handleHelp)
  bot.command('events', handleEventsList)
  bot.command('me', handleMe)
  bot.command('subscribe', handleSubscribe)
  bot.command('unsubscribe', handleUnsubscribe)
  bot.command('cancel', handleCancel)

  // ----- Callback queries -----
  bot.callbackQuery(/^cmd:/, async (ctx) => {
    await ctx.answerCallbackQuery()
    if (ctx.callbackQuery.data === 'cmd:events') {
      return handleEventsList(ctx)
    }
  })

  bot.callbackQuery(/^open:/, async (ctx) => {
    const eventId = ctx.callbackQuery.data?.slice('open:'.length)
    if (!eventId) return
    return handleEventOpen(ctx, eventId)
  })

  bot.callbackQuery(/^rsvp:(going|maybe|not_going):/, async (ctx) => {
    const data = ctx.callbackQuery.data ?? ''
    const m = data.match(/^rsvp:(going|maybe|not_going):(.+)$/)
    if (!m) return
    return handleRsvpCallback(ctx, m[1] as 'going' | 'maybe' | 'not_going', m[2])
  })

  bot.callbackQuery(/^contribute:/, async (ctx) => {
    const data = ctx.callbackQuery.data ?? ''
    const m = data.match(/^contribute:(.+)$/)
    if (!m) return
    return handleContributeStart(ctx, m[1])
  })

  bot.callbackQuery(/^amt:\d+:/, async (ctx) => {
    const data = ctx.callbackQuery.data ?? ''
    const m = data.match(/^amt:(\d+):(.+)$/)
    if (!m) return
    return handleAmountPreset(ctx, m[1], m[2])
  })

  bot.callbackQuery(/^amt:custom:/, async (ctx) => {
    const data = ctx.callbackQuery.data ?? ''
    const m = data.match(/^amt:custom:(.+)$/)
    if (!m) return
    return handleAmountCustom(ctx, m[1])
  })

  // ----- Fallback -----
  bot.on('message', handleUnknown)

  bot.catch((err) => {
    console.error('[bot] error:', err)
  })

  // ----- HTTP server (webhook + internal broadcast + healthcheck) -----
  const app = express()
  app.use(express.json())

  if (useWebhook) {
    // grammY's webhookCallback is typed against `Bot<Context>` (без нашего
    // SessionFlavor), хотя на runtime наш Bot<BotContext> полностью
    // совместим — callback просто прокидывает ctx в bot.handleUpdate.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.use('/webhook', webhookCallback(bot as any, 'express'))
    console.log(`[bot] webhook registered: ${config.WEBHOOK_URL}`)
  }

  mountInternalBroadcast(app, bot)

  let lastTelegramOkAt = 0
  setInterval(async () => {
    try {
      await bot.api.getMe()
      lastTelegramOkAt = Date.now()
    } catch {
      // ignore — останется старый lastTelegramOkAt
    }
  }, 60_000)

  app.get('/healthz', (_req, res) => {
    const age = Date.now() - lastTelegramOkAt
    if (lastTelegramOkAt > 0 && age < 180_000) {
      res.status(200).send('ok')
    } else {
      res.status(503).send('stale')
    }
  })

  app.listen(config.BOT_PORT, '0.0.0.0', () => {
    console.log(`[bot] listening on :${config.BOT_PORT}`)
  })

  // ----- Запуск -----
  if (useWebhook) {
    // Регистрируем webhook у Telegram. Если прокси недоступен (или
    // TELEGRAM_SOCKS5_PROXY указывает на закрытый порт), бот не должен
    // падать — пусть слушает webhook endpoint и принимает апдейты.
    // Telegram продолжит слать их на URL, который был успешно
    // зарегистрирован раньше.
    try {
      await bot.api.setWebhook(config.WEBHOOK_URL!)
      const me = await bot.api.getMe()
      lastTelegramOkAt = Date.now()
      console.log(`[bot] @${me.username} ready (webhook)`)
    } catch (err) {
      console.warn(
        `[bot] setWebhook/getMe failed: ${(err as Error).message}\n` +
          `  Бот продолжит слушать ${config.WEBHOOK_URL}, но Telegram не знает об этом URL.\n` +
          `  Проверьте TELEGRAM_SOCKS5_PROXY (или прямой доступ из Docker network).`,
      )
      console.warn('[bot] cause:', (err as { cause?: unknown }).cause ?? err)
      // Не выходим — бот всё равно полезен (healthcheck, internal broadcast).
    }
  } else {
    // Long polling — local dev
    bot.start()
    try {
      const me = await bot.api.getMe()
      lastTelegramOkAt = Date.now()
      console.log(`[bot] @${me.username} ready (long polling)`)
    } catch (err) {
      console.warn(`[bot] getMe failed: ${(err as Error).message}`)
    }
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[bot] received ${signal}, stopping...`)
    if (!useWebhook) {
      bot.stop()
    }
    process.exit(0)
  }
  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch((err) => {
  console.error('[bot] fatal:', err)
  process.exit(1)
})
