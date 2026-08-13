import crypto from 'node:crypto'
import type { BotContext } from '../session'
import { getBotPayload } from '../db'

/**
 * RSVP callback: `rsvp:<status>:<eventId>`.
 * status: 'going' | 'maybe' | 'not_going'
 *
 * Если у юзера ещё нет RSVP — создаём. Если есть — обновляем.
 * Анонимный RSVP (без user) невозможен из бота — нужен Telegram Login Widget.
 */
export async function handleRsvpCallback(
  ctx: BotContext,
  status: 'going' | 'maybe' | 'not_going',
  eventIdStr: string,
): Promise<void> {
  await ctx.answerCallbackQuery()

  const userId = ctx.session.userId
  const telegramId = ctx.session.telegramId
  if (!telegramId) {
    await ctx.reply('Не удалось определить твой Telegram ID. /start ещё раз.')
    return
  }

  if (!userId) {
    await ctx.reply(
      'Чтобы записаться, нужно сначала войти через сайт.\n' +
        'Открой дачу, нажми «Войти через Telegram» на любой странице, и попробуй ещё раз.',
    )
    return
  }

  const payload = await getBotPayload()

  // Ищем существующий RSVP
  const existing = await payload.find({
    collection: 'event-rsvps',
    where: {
      and: [{ event: { equals: eventIdStr } }, { user: { equals: userId } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const name =
    ctx.session.firstName ??
    ctx.from?.first_name ??
    (ctx.from?.username ? `@${ctx.from.username}` : 'Аноним')

  if (existing.docs[0]) {
    await payload.update({
      collection: 'event-rsvps',
      id: (existing.docs[0] as { id: string | number }).id,
      data: { status },
      overrideAccess: true,
    })
  } else {
    await payload.create({
      collection: 'event-rsvps',
      // Payload генерирует строгие типы: relationship ожидает `number | Document`,
      // но ID из URL может быть строкой. На runtime оба варианта валидны —
      // кастим минимально (eventId → number где возможно).
      data: {
        event: Number(eventIdStr),
        user: Number(userId),
        name,
        status,
        secretKey: crypto.randomUUID(),
        guestsCount: 1,
      },
      overrideAccess: true,
    })
  }

  const label =
    status === 'going' ? 'Записал тебя ✅' : status === 'maybe' ? 'Ок, может быть 🟡' : 'Понял, не сможешь 🔴'
  await ctx.reply(label)
}
