import type { BotContext } from '../session'
import { getBotPayload } from '../db'
import { amountPresetsKeyboard } from '../keyboards/inline'
import { formatRub, pluralRubles } from '../utils/format'

/**
 * Contribution flow:
 *
 *   1. Юзер жмёт "💸 Скинуться" на карточке → callback `contribute:<eventId>`.
 *      Бот показывает пресеты сумм и кнопку "Другая сумма".
 *
 *   2. Юзер жмёт `amt:100:<eventId>` (или другой пресет) → бот создаёт
 *      pending EventContribution через /api/event-contributions/submit,
 *      возвращает inline-кнопку оплаты ЮMoney.
 *
 *   3. Или жмёт `amt:custom:<eventId>` → бот просит ввести число, ставит FSM,
 *      следующее текстовое сообщение парсится как сумма.
 */

const APP_INTERNAL_URL = process.env.APP_INTERNAL_URL ?? 'http://app:3000'

export async function handleContributeStart(
  ctx: BotContext,
  eventIdStr: string,
): Promise<void> {
  await ctx.answerCallbackQuery()

  const payload = await getBotPayload()
  let event: { id: string | number; title: string; slug: string } | undefined
  try {
    const res = await payload.findByID({
      collection: 'events',
      id: eventIdStr,
      depth: 0,
      overrideAccess: true,
    })
    event = res as unknown as { id: string | number; title: string; slug: string }
  } catch {
    await ctx.reply('Событие не найдено.')
    return
  }
  if (!event) {
    await ctx.reply('Событие не найдено.')
    return
  }

  const text = `Сколько хотите скинуться на «${event.title}»? Выберите сумму или введите свою:`
  await ctx.reply(text, {
    reply_markup: amountPresetsKeyboard(event.id),
  })
}

export async function handleAmountPreset(
  ctx: BotContext,
  amountStr: string,
  eventIdStr: string,
): Promise<void> {
  await ctx.answerCallbackQuery()
  const amount = Number(amountStr)
  if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000) {
    await ctx.reply('Некорректная сумма.')
    return
  }
  await submitContribution(ctx, eventIdStr, amount)
}

/**
 * Юзер жмёт «Другая сумма» — переходим в FSM-режим, ждём число.
 */
export async function handleAmountCustom(
  ctx: BotContext,
  eventIdStr: string,
): Promise<void> {
  await ctx.answerCallbackQuery()
  const payload = await getBotPayload()
  const event = (await payload.findByID({
    collection: 'events',
    id: eventIdStr,
    depth: 0,
    overrideAccess: true,
  })) as { id: string | number; title: string; slug: string }

  ctx.session.fsm = {
    contributingToEventId: event.id,
    contributingToEventSlug: event.slug,
    contributingToEventTitle: event.title,
  }

  await ctx.reply(
    `Введите сумму в рублях числом (например, 750).\n` +
      `Отмена: /cancel.`,
  )
}

/**
 * Текстовое сообщение в режиме FSM — парсим как сумму.
 */
export async function handleCustomAmountMessage(ctx: BotContext): Promise<boolean> {
  const fsm = ctx.session.fsm
  if (!fsm?.contributingToEventId) return false

  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : ''
  if (!text) return false

  const amount = Number(text.trim().replace(/\s+/g, '').replace(',', '.'))
  if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000) {
    await ctx.reply('Не похоже на число от 1 до 1 000 000. Попробуй ещё раз или /cancel.')
    return true
  }

  await submitContribution(ctx, String(fsm.contributingToEventId), amount)
  ctx.session.fsm = {}
  return true
}

export async function handleCancel(ctx: BotContext): Promise<void> {
  if (ctx.session.fsm) {
    ctx.session.fsm = {}
    await ctx.reply('Отменил.')
  } else {
    await ctx.reply('Нечего отменять.')
  }
}

/**
 * Создаёт pending EventContribution через /submit endpoint и шлёт кнопку оплаты.
 */
async function submitContribution(
  ctx: BotContext,
  eventIdStr: string,
  amount: number,
): Promise<void> {
  const payload = await getBotPayload()
  const event = (await payload.findByID({
    collection: 'events',
    id: eventIdStr,
    depth: 0,
    overrideAccess: true,
  })) as { id: string | number; title: string; slug: string }

  const name =
    ctx.session.firstName ??
    ctx.from?.first_name ??
    (ctx.from?.username ? `@${ctx.from.username}` : 'Аноним')

  // Используем тот же endpoint, что и сайт — единая логика Quickpay URL.
  try {
    const res = await fetch(`${APP_INTERNAL_URL}/api/event-contributions/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: event.slug,
        name,
        amount,
        message: '',
      }),
    })
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean
      paymentUrl?: string
      error?: string
    }
    if (!res.ok || !data.ok || !data.paymentUrl) {
      await ctx.reply(
        `Не получилось создать заявку: ${data.error ?? res.status}. Попробуй позже.`,
      )
      return
    }

    await ctx.reply(
      `✅ Заявка на ${formatRub(amount)} (${amount} ${pluralRubles(amount)}) принята.\n` +
        `Нажми кнопку ниже, чтобы оплатить через ЮMoney:`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '💳 Оплатить через ЮMoney', url: data.paymentUrl }],
          ],
        },
      },
    )
  } catch (err) {
    console.error('[contribute] submit failed:', err)
    await ctx.reply('Ошибка связи с сайтом. Попробуй позже.')
  }
}
