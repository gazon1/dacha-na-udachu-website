import type { BotContext } from '../session'
import { getBotPayload } from '../db'

/**
 * /subscribe — подписаться на push о новых событиях.
 * /unsubscribe — отписаться.
 */
export async function handleSubscribe(ctx: BotContext): Promise<void> {
  const telegramId = ctx.session.telegramId
  const chatId = String(ctx.chatId ?? ctx.from?.id ?? '')
  if (!telegramId || !chatId) {
    await ctx.reply('Не удалось определить твой Telegram ID.')
    return
  }

  const payload = await getBotPayload()
  const existing = await payload.find({
    collection: 'telegram-subscribers',
    where: { telegramId: { equals: telegramId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const baseData = {
    telegramId,
    chatId,
    firstName: ctx.session.firstName,
    username: ctx.session.username,
    subscribedAt: new Date().toISOString(),
    optedOutAt: null,
    user: ctx.session.userId !== null ? Number(ctx.session.userId) : null,
  }

  if (existing.docs[0]) {
    await payload.update({
      collection: 'telegram-subscribers',
      id: (existing.docs[0] as { id: string | number }).id,
      data: baseData,
      overrideAccess: true,
    })
  } else {
    await payload.create({
      collection: 'telegram-subscribers',
      data: baseData,
      overrideAccess: true,
    })
  }

  await ctx.reply('✅ Подписался! Пришлю уведомление, как только появится новое событие.')
}

export async function handleUnsubscribe(ctx: BotContext): Promise<void> {
  const telegramId = ctx.session.telegramId
  if (!telegramId) {
    await ctx.reply('Не удалось определить твой Telegram ID.')
    return
  }

  const payload = await getBotPayload()
  const existing = await payload.find({
    collection: 'telegram-subscribers',
    where: { telegramId: { equals: telegramId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  if (!existing.docs[0]) {
    await ctx.reply('Ты и не был подписан.')
    return
  }

  await payload.update({
    collection: 'telegram-subscribers',
    id: (existing.docs[0] as { id: string | number }).id,
    data: { optedOutAt: new Date().toISOString() },
    overrideAccess: true,
  })

  await ctx.reply('Отписал. Чтобы снова получать анонсы — /subscribe.')
}
