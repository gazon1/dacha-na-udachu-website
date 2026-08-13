import type { BotContext } from '../session'
import { getBotPayload } from '../db'

/**
 * Подтягивает User из Payload по ctx.from.id, кладёт результат в ctx.session.
 *
 * Юзер мог:
 *   1) Никогда не логиниться через Telegram Login Widget — userId === null,
 *      но bot всё равно знает telegramId (для /subscribe).
 *   2) Логиниться — userId заполнен, role доступен для /admin.
 *
 * Кешировать не нужно: ctx.session уже persistent (grammY встроенный session).
 */
export async function sessionMiddleware(
  ctx: BotContext,
  next: () => Promise<void>,
): Promise<void> {
  if (!ctx.from) return next()

  // Если уже заполнено в этой сессии — пропускаем (но ctx.from.id всегда
  // перезаписываем на случай смены юзером username/имени).
  const telegramId = String(ctx.from.id)

  if (!ctx.session.telegramId) {
    ctx.session.telegramId = telegramId
    ctx.session.userId = null
    ctx.session.role = null
    ctx.session.firstName = ctx.from.first_name ?? null
    ctx.session.username = ctx.from.username ?? null
  } else {
    // refresh volatile fields
    ctx.session.firstName = ctx.from.first_name ?? ctx.session.firstName
    ctx.session.username = ctx.from.username ?? ctx.session.username
  }

  // Лениво подтягиваем User из БД. Только если ещё не подтянут — чтобы
  // не бить БД на каждый update.
  if (ctx.session.userId === null && ctx.session.role === null) {
    try {
      const payload = await getBotPayload()
      const res = await payload.find({
        collection: 'users',
        where: { telegramId: { equals: telegramId } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      const user = res.docs[0] as
        | { id: string | number; role?: 'admin' | 'user' }
        | undefined
      if (user) {
        ctx.session.userId = user.id
        ctx.session.role = user.role ?? 'user'
      }
    } catch (err) {
      console.error('[session] failed to load user:', err)
    }
  }

  return next()
}
