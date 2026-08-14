import { InlineKeyboard } from 'grammy'
import { truncate } from '../utils/format'
import { siteEventsUrl } from '../utils/url'

/**
 * Фабрики inline-клавиатур для разных экранов бота.
 */

/**
 * Inline-список ближайших событий. Один ряд на событие, кнопка открывает карточку.
 */
export function eventsListKeyboard(
  events: Array<{ id: string | number; title: string }>,
): InlineKeyboard {
  const kb = new InlineKeyboard()
  for (const e of events) {
    kb.text(`📅 ${truncate(e.title, 30)}`, `open:${e.id}`).row()
  }
  return kb
}

/**
 * Карточка события — RSVP + вклад на сайт + скинуться.
 * Если передан slug, добавляется кнопка «🌐 На сайте».
 */
export function eventCardKeyboard(eventId: string | number, slug?: string): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text('🟢 Иду', `rsvp:going:${eventId}`)
    .text('🟡 Может быть', `rsvp:maybe:${eventId}`)
    .row()
    .text('🔴 Не смогу', `rsvp:not_going:${eventId}`)
    .text('💸 Скинуться', `contribute:${eventId}`)
    .row()

  if (slug) {
    kb.text('🌐 На сайте', siteEventsUrl(slug)).row()
  }

  return kb
}

/**
 * Пресеты сумм для взноса.
 */
export function amountPresetsKeyboard(eventId: string | number): InlineKeyboard {
  return new InlineKeyboard()
    .text('100 ₽', `amt:100:${eventId}`)
    .text('300 ₽', `amt:300:${eventId}`)
    .text('500 ₽', `amt:500:${eventId}`)
    .row()
    .text('1 000 ₽', `amt:1000:${eventId}`)
    .text('2 000 ₽', `amt:2000:${eventId}`)
    .text('5 000 ₽', `amt:5000:${eventId}`)
    .row()
    .text('Другая сумма', `amt:custom:${eventId}`)
}

/**
 * Клавиатура подтверждения взноса.
 */
export function contributionConfirmKeyboard(eventId: string | number): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Подтвердить', `pay:confirm:${eventId}`)
    .text('✏️ Сообщение', `pay:msg:${eventId}`)
    .row()
    .text('💰 Изменить сумму', `pay:amount:${eventId}`)
}
