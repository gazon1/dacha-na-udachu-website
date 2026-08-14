import type { BotContext } from '../session'

/**
 * Сбрасывает FSM-состояние, когда пользователь отправляет любую команду,
 * чтобы прервать незавершённый flow (например, «скинуться» → `/events»).
 * Middleware должен быть зарегистрирован после sessionMiddleware,
 * но до обработчиков команд.
 */
export async function clearFsmOnCommandMiddleware(
  ctx: BotContext,
  next: () => Promise<void>,
): Promise<void> {
  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : null
  if (text && text.startsWith('/')) {
    ctx.session.fsm = undefined
  }
  return next()
}
