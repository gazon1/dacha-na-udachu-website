import type { BotContext } from '../session'

const APP_INTERNAL_URL = process.env.APP_INTERNAL_URL ?? 'http://app:3000'

type CheckResult =
  | { ok: true; status: 'confirmed' | 'pending' | 'rejected' }
  | { ok: false; reason: string; retryAfterMs?: number }

/**
 * Handles the "✅ Я перевёл — проверить" callback from the contribution flow.
 * Calls POST /api/event-contributions/check-by-secret and edits the original
 * message to show the result.
 */
export async function handleTransferCheck(
  ctx: BotContext,
  secretKey: string,
): Promise<void> {
  await ctx.answerCallbackQuery({ text: 'Проверяю…' })

  let result: CheckResult
  try {
    const res = await fetch(`${APP_INTERNAL_URL}/api/event-contributions/check-by-secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secretKey }),
    })
    result = (await res.json()) as CheckResult
  } catch {
    await ctx.answerCallbackQuery({
      text: 'Ошибка связи с сайтом. Попробуй позже.',
      show_alert: true,
    })
    return
  }

  if (!result.ok) {
    const messages: Record<string, string> = {
      no_token: 'Платёжная система не настроена на сервере.',
      api_error: 'Не получилось проверить. Попробуй через минуту.',
      not_found: 'Заявка не найдена. Возможно, она уже обработана.',
    }
    const toast = messages[result.reason] ?? 'Что-то пошло не так.'
    await ctx.answerCallbackQuery({ text: toast, show_alert: true })
    return
  }

  // Terminal states — edit the original payment message.
  if (result.status === 'confirmed') {
    try {
      await ctx.editMessageText('✅ <b>Оплата подтверждена!</b>\nСпасибо за поддержку! 🎉', {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [] },
      })
    } catch (err) {
      // Message was probably already edited or deleted — fall back to a reply.
      const msg = await ctx.reply('✅ <b>Оплата подтверждена!</b>\nСпасибо за поддержку! 🎉', {
        parse_mode: 'HTML',
      })
      void msg
    }
    return
  }

  if (result.status === 'rejected') {
    try {
      await ctx.editMessageText(
        '⚠️ <b>Сумма не совпала</b>\nПеревод пришёл на другую сумму. Свяжитесь с организатором.',
        { parse_mode: 'HTML', reply_markup: { inline_keyboard: [] } },
      )
    } catch {
      await ctx.reply(
        '⚠️ <b>Сумма не совпала</b>\nПеревод пришёл на другую сумму. Свяжитесь с организатором.',
        { parse_mode: 'HTML' },
      )
    }
    return
  }

  // Still pending.
  const retryMs = result.ok && !result.status ? (result as { retryAfterMs?: number }).retryAfterMs : undefined
  const wait = retryMs ? Math.ceil(retryMs / 1000) : 15
  await ctx.answerCallbackQuery({
    text: `Платёж пока не поступил. Попробуй через ${wait} сек.`,
    show_alert: false,
  })
}
