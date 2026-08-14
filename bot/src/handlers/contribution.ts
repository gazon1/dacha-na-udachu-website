import type { BotContext } from '../session'
import { getBotPayload } from '../db'
import { amountPresetsKeyboard, contributionConfirmKeyboard } from '../keyboards/inline'
import { formatRub, pluralRubles } from '../utils/format'

const APP_INTERNAL_URL = process.env.APP_INTERNAL_URL ?? 'http://app:3000'

type Event = {
  id: string | number
  slug: string
  title: string
}

/**
 * Загружает событие по ID или возвращает null.
 */
async function loadEvent(eventIdStr: string): Promise<Event | null> {
  const payload = await getBotPayload()
  try {
    const res = await payload.findByID({
      collection: 'events',
      id: eventIdStr,
      depth: 0,
      overrideAccess: true,
    })
    return res as Event
  } catch {
    return null
  }
}

/**
 * Показывает экран подтверждения взноса с выбранной суммой и опциональным сообщением.
 */
async function showConfirmation(
  ctx: BotContext,
  event: Event,
  amount: number,
  message: string,
): Promise<void> {
  const lines: string[] = []
  lines.push(`💸 <b>Взнос на «${event.title}»</b>`)
  lines.push(`Сумма: <b>${formatRub(amount)}</b>`)
  if (message) {
    lines.push(`Сообщение: <i>${message}</i>`)
  }

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'HTML',
    reply_markup: contributionConfirmKeyboard(event.id),
  })
}

/**
 * Пользователь нажал «💸 Скинуться» на карточке — показываем пресеты.
 */
export async function handleContributeStart(
  ctx: BotContext,
  eventIdStr: string,
): Promise<void> {
  await ctx.answerCallbackQuery()

  const event = await loadEvent(eventIdStr)
  if (!event) {
    await ctx.reply('Событие не найдено.')
    return
  }

  // Запоминаем событие в FSM — пригодятся для восстановления после «изменить сумму»
  ctx.session.fsm = {
    contributingToEventId: event.id,
    contributingToEventSlug: event.slug,
    contributingToEventTitle: event.title,
  }

  const text = `Сколько хотите скинуться на «${event.title}»? Выберите сумму или введите свою:`
  await ctx.reply(text, {
    reply_markup: amountPresetsKeyboard(event.id),
  })
}

/**
 * Пресетная сумма — сразу показываем экран подтверждения.
 */
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

  const event = await loadEvent(eventIdStr)
  if (!event) {
    await ctx.reply('Событие не найдено.')
    return
  }

  ctx.session.fsm = {
    contributingToEventId: event.id,
    contributingToEventSlug: event.slug,
    contributingToEventTitle: event.title,
    pendingAmount: amount,
    pendingMessage: ctx.session.fsm?.pendingMessage ?? '',
  }

  await showConfirmation(ctx, event, amount, ctx.session.fsm.pendingMessage ?? '')
}

/**
 * Пользователь нажал «Другая сумма» — переходим в режим ввода суммы.
 */
export async function handleAmountCustom(
  ctx: BotContext,
  eventIdStr: string,
): Promise<void> {
  await ctx.answerCallbackQuery()

  const event = await loadEvent(eventIdStr)
  if (!event) {
    await ctx.reply('Событие не найдено.')
    return
  }

  ctx.session.fsm = {
    contributingToEventId: event.id,
    contributingToEventSlug: event.slug,
    contributingToEventTitle: event.title,
    pendingAmount: ctx.session.fsm?.pendingAmount,
    pendingMessage: ctx.session.fsm?.pendingMessage ?? '',
    step: 'awaiting_custom_amount',
  }

  await ctx.reply(
    `Введите сумму в рублях числом (например, 750).\n` + `Отмена: /cancel.`,
  )
}

/**
 * Текстовое сообщение в режиме FSM.
 * Возвращает true, если сообщение было обработано как часть FSM.
 */
export async function handleCustomAmountMessage(ctx: BotContext): Promise<boolean> {
  const fsm = ctx.session.fsm
  if (!fsm?.contributingToEventId) return false

  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : ''
  if (!text) return false

  if (fsm.step === 'awaiting_message') {
    // Пользователь вводит текстовое сообщение к взносу.
    fsm.pendingMessage = text.trim()
    fsm.step = undefined
    const event = await loadEvent(String(fsm.contributingToEventId))
    if (!event) {
      await ctx.reply('Событие не найдено.')
      return true
    }
    await showConfirmation(ctx, event, fsm.pendingAmount ?? 0, fsm.pendingMessage ?? '')
    return true
  }

  if (fsm.step === 'awaiting_custom_amount') {
    // Парсим сумму.
    const amount = Number(text.trim().replace(/\s+/g, '').replace(',', '.'))
    if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000) {
      await ctx.reply(
        'Не похоже на число от 1 до 1 000 000. Попробуй ещё раз или /cancel.',
      )
      return true
    }
    fsm.pendingAmount = amount
    fsm.step = undefined
    const event = await loadEvent(String(fsm.contributingToEventId))
    if (!event) {
      await ctx.reply('Событие не найдено.')
      return true
    }
    await showConfirmation(ctx, event, amount, fsm.pendingMessage ?? '')
    return true
  }

  return false
}

/**
 * /cancel — сброс любого FSM-состояния.
 */
export async function handleCancel(ctx: BotContext): Promise<void> {
  if (ctx.session.fsm) {
    ctx.session.fsm = {}
    await ctx.reply('Отменил.')
  } else {
    await ctx.reply('Нечего отменять.')
  }
}

/**
 * Callback «✅ Подтвердить» — создаём pending EventContribution.
 */
export async function handleContributionConfirm(
  ctx: BotContext,
  eventIdStr: string,
): Promise<void> {
  await ctx.answerCallbackQuery()

  const fsm = ctx.session.fsm
  if (
    !fsm ||
    String(fsm.contributingToEventId) !== eventIdStr ||
    fsm.pendingAmount === undefined
  ) {
    await ctx.reply('Сначала выбери сумму через «💸 Скинуться» на карточке события.')
    return
  }

  const event = await loadEvent(eventIdStr)
  if (!event) {
    await ctx.reply('Событие не найдено.')
    return
  }

  await submitContribution(ctx, eventIdStr, fsm.pendingAmount, fsm.pendingMessage ?? '')
  ctx.session.fsm = {}
}

/**
 * Callback «✏️ Сообщение» — просим пользователя ввести сообщение.
 */
export async function handleContributionAskMessage(
  ctx: BotContext,
  eventIdStr: string,
): Promise<void> {
  await ctx.answerCallbackQuery()

  const fsm = ctx.session.fsm
  if (!fsm || String(fsm.contributingToEventId) !== eventIdStr) {
    await ctx.reply('Сначала выбери сумму через «💸 Скинуться» на карточке события.')
    return
  }

  fsm.step = 'awaiting_message'
  await ctx.reply('Введите сообщение к взносу (или отправьте «—» чтобы пропустить):')
}

/**
 * Callback «💰 Изменить сумму» — возвращаемся к пресетам, сохраняем сообщение.
 */
export async function handleContributionChangeAmount(
  ctx: BotContext,
  eventIdStr: string,
): Promise<void> {
  await ctx.answerCallbackQuery()

  const fsm = ctx.session.fsm
  if (!fsm || String(fsm.contributingToEventId) !== eventIdStr) {
    await ctx.reply('Сначала выбери сумму через «💸 Скинуться» на карточке события.')
    return
  }

  // Сохраняем message, сбрасываем сумму и шаг.
  ctx.session.fsm = {
    contributingToEventId: fsm.contributingToEventId,
    contributingToEventSlug: fsm.contributingToEventSlug,
    contributingToEventTitle: fsm.contributingToEventTitle,
    pendingMessage: fsm.pendingMessage,
  }

  await ctx.reply(
    `Введите новую сумму или выберите пресет. Сообщение сохранено.`,
    { reply_markup: amountPresetsKeyboard(eventIdStr) },
  )
}

/**
 * Создаёт pending EventContribution через /submit endpoint и шлёт кнопку оплаты.
 */
async function submitContribution(
  ctx: BotContext,
  eventIdStr: string,
  amount: number,
  message: string,
): Promise<void> {
  const event = await loadEvent(eventIdStr)
  if (!event) {
    await ctx.reply('Событие не найдено.')
    return
  }

  const name =
    ctx.session.firstName ??
    ctx.from?.first_name ??
    (ctx.from?.username ? `@${ctx.from.username}` : 'Аноним')

  try {
    const res = await fetch(`${APP_INTERNAL_URL}/api/event-contributions/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: event.slug,
        name,
        amount,
        message,
      }),
    })

    let data: { ok?: boolean; paymentUrl?: string; error?: string } = {}
    try {
      data = (await res.json()) as typeof data
    } catch {
      // JSON parse error — пользуемся статусом
    }

    if (!res.ok || !data.ok || !data.paymentUrl) {
      const errMsg = data.error ?? res.status.toString()
      console.error(`[contribute] submit failed: ${res.status} — ${errMsg}`)
      await ctx.reply(`Не получилось создать заявку: ${errMsg}. Попробуй позже.`)
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
    console.error('[contribute] submit network error:', err)
    await ctx.reply('Ошибка связи с сайтом. Попробуй позже.')
  }
}
