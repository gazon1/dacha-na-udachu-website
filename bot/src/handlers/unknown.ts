import type { BotContext } from '../session'

/**
 * Fallback для неизвестных команд и сообщений без FSM.
 * Если активен FSM contribution — обрабатываем как ввод суммы.
 */
export async function handleUnknown(ctx: BotContext): Promise<void> {
  // FSM для ввода суммы
  if (ctx.session.fsm?.contributingToEventId) {
    const { handleCustomAmountMessage } = await import('./contribution')
    const handled = await handleCustomAmountMessage(ctx)
    if (handled) return
  }

  await ctx.reply('Не понял. Напиши /help для списка команд.')
}
