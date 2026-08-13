import { Bot } from 'grammy'
import { getBotPayload } from '../db'
import { escapeHtml } from './escapeHtml'
import { formatDate } from './format'

/**
 * Broadcast нового события всем активным подписчикам.
 *
 * Идемпотентность: на стороне TelegramSubscribers обновляем
 * lastNotifiedEventId — если уже слали по этому eventId, broadcastEvent
 * тихо ничего не делает (вызывающий код проверяет).
 *
 * Rate-limit: ~25 msg/s (40ms между сообщениями) — ниже лимита Telegram
 * (30 msg/s global, 1 msg/s в один чат).
 */
export async function broadcastEvent(
  bot: Bot,
  eventId: string | number,
  title: string,
  slug: string,
  startDate: string,
): Promise<{ sent: number; failed: number; skipped: number }> {
  const payload = await getBotPayload()

  const subs = await payload.find({
    collection: 'telegram-subscribers',
    where: {
      and: [
        { optedOutAt: { equals: null } },
        { lastNotifiedEventId: { not_equals: String(eventId) } },
      ],
    },
    limit: 5000,
    depth: 0,
    overrideAccess: true,
  })

  const list = subs.docs as Array<{ id: string | number; chatId: string; telegramId: string }>
  if (list.length === 0) {
    return { sent: 0, failed: 0, skipped: 0 }
  }

  const text =
    `🆕 <b>Новое событие:</b> ${escapeHtml(title)}\n` +
    `🗓 ${formatDate(startDate)}`

  let sent = 0
  let failed = 0

  for (const sub of list) {
    try {
      await bot.api.sendMessage(sub.chatId, text, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📋 Открыть событие', callback_data: `open:${eventId}` },
              {
                text: '🌐 На сайте',
                url: `${process.env.PAYLOAD_PUBLIC_SERVER_URL ?? 'https://dacha.maxdrobin.ru'}/events/${slug}`,
              },
            ],
          ],
        },
      })
      sent++
    } catch (err) {
      const code = (err as { error_code?: number }).error_code
      // 403 — пользователь заблокировал бота. Помечаем optedOutAt.
      if (code === 403) {
        await payload
          .update({
            collection: 'telegram-subscribers',
            id: sub.id,
            data: { optedOutAt: new Date().toISOString() },
            overrideAccess: true,
          })
          .catch(() => undefined)
      }
      failed++
    }
    // 40ms между сообщениями — ~25 msg/s, ниже лимита Telegram
    await new Promise((r) => setTimeout(r, 40))
  }

  // Помечаем lastNotifiedEventId у всех кому слали (или пытались)
  if (list.length > 0) {
    await payload
      .update({
        collection: 'telegram-subscribers',
        where: { id: { in: list.map((s) => s.id) } },
        data: { lastNotifiedEventId: String(eventId) },
        overrideAccess: true,
      })
      .catch((err) => console.error('[broadcast] failed to mark lastNotifiedEventId:', err))
  }

  return { sent, failed, skipped: 0 }
}
