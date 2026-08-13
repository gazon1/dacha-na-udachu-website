import type { CollectionConfig } from 'payload'
import { isAdmin } from '../lib/access'

/**
 * TelegramSubscribers — подписчики Telegram-бота на новые события.
 *
 * Отдельная коллекция (не флаг на Users), потому что:
 *   1. Подписаться может человек, ни разу не логинившийся через Telegram Login
 *      Widget на сайте — `/subscribe` не требует регистрации.
 *   2. Разные жизненные циклы: пользователь может остаться юзером сайта,
 *      но отписаться от пушей.
 *
 * Все записи пишутся ботом через `overrideAccess: true` — direct API закрыт.
 * Админ видит список, может удалить.
 */
export const TelegramSubscribers: CollectionConfig = {
  slug: 'telegram-subscribers',
  admin: {
    useAsTitle: 'telegramId',
    defaultColumns: ['telegramId', 'firstName', 'subscribedAt', 'optedOutAt'],
    group: 'Система',
    description: 'Подписчики Telegram-бота на новые события.',
  },
  access: {
    read: isAdmin,
    create: () => false,
    update: () => false,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'telegramId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      maxLength: 50,
      admin: { description: 'Числовой Telegram ID пользователя (ctx.from.id)' },
    },
    {
      name: 'chatId',
      type: 'text',
      required: true,
      maxLength: 50,
      admin: { description: 'Чат, в который слать сообщения. Обычно равен telegramId для лички' },
    },
    { name: 'firstName', type: 'text', maxLength: 200 },
    { name: 'username', type: 'text', maxLength: 64 },
    {
      name: 'subscribedAt',
      type: 'date',
      required: true,
      admin: { description: 'Когда подписался' },
    },
    {
      name: 'optedOutAt',
      type: 'date',
      index: true,
      admin: { description: 'Когда отписался (или бот получил 403 — пользователь заблокировал)' },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      admin: { description: 'Опциональная связь с User (если был логин через Telegram Login Widget)' },
    },
    {
      name: 'lastNotifiedEventId',
      type: 'text',
      index: true,
      admin: { description: 'ID последнего события, по которому ушло уведомление (для идемпотентности)' },
    },
  ],
}
