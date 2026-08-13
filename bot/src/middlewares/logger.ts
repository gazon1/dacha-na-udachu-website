import type { BotContext } from '../session'

/**
 * Простой логгер апдейтов — помогает дебажить в продах.
 * GrammY сам логирует ошибки через bot.catch(), этот логгер для успешных.
 */
export async function loggerMiddleware(
  ctx: BotContext,
  next: () => Promise<void>,
): Promise<void> {
  const chatId = ctx.chatId ?? ctx.from?.id
  const username = ctx.from?.username ?? ctx.from?.first_name ?? 'anon'
  let label = 'unknown'

  if (ctx.message && 'text' in ctx.message) {
    label = ctx.message.text?.slice(0, 60) ?? 'empty'
  } else if (ctx.callbackQuery) {
    label = `callback:${ctx.callbackQuery.data?.slice(0, 40)}`
  }

  const start = Date.now()
  await next()
  const ms = Date.now() - start

  console.log(`[bot] ${username} (chat ${chatId}) → ${label}  (${ms}ms)`)
}
