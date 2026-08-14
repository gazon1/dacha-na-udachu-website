import type { GlobalConfig } from 'payload'
import { isAdmin } from '../lib/access'

/**
 * SiteSettings — single-instance global for brand & contact info.
 *
 * Replaces hardcoded literals scattered across Footer/Header/metadata with
 * one admin-editable source. Lives at /admin/globals/site-settings.
 *
 * Access: anyone can read (used on public pages), only admins can write.
 */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  admin: {
    group: 'Система',
    description: 'Бренд, контакты, соцсети — применяется на всём сайте.',
  },
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: 'brand',
      type: 'group',
      label: 'Бренд',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          defaultValue: 'Дача на удачу',
          admin: { description: 'Название бренда — отображается в Header и Footer.' },
        },
        {
          name: 'tagline',
          type: 'text',
          defaultValue: 'Уютное пространство для встреч, мероприятий и отдыха',
        },
        {
          name: 'copyright',
          type: 'text',
          defaultValue: 'Дача на удачу. Все права защищены.',
        },
      ],
    },
    {
      name: 'contacts',
      type: 'group',
      label: 'Контакты',
      fields: [
        { name: 'email', type: 'email', defaultValue: 'hello@example.com' },
        { name: 'phone', type: 'text', defaultValue: '+7 (000) 000-00-00' },
        { name: 'address', type: 'textarea' },
      ],
    },
    {
      name: 'socialLinks',
      type: 'array',
      label: 'Соцсети',
      admin: {
        description:
          'Иконка: либо Material Symbols name (например "send"), либо путь к /public/...',
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          admin: { description: 'aria-label и подсказка при наведении.' },
        },
        {
          name: 'url',
          type: 'text',
          required: true,
          admin: { description: 'Полный URL, например https://t.me/handle' },
        },
        {
          name: 'icon',
          type: 'text',
          admin: { description: 'Имя Material Symbols (например send, share)' },
        },
        {
          name: 'img',
          type: 'text',
          admin: {
            description: 'Путь от корня /public (например /icons/vk.svg). Приоритет над icon.',
          },
        },
      ],
    },
    {
      name: 'telegramAdmins',
      type: 'array',
      label: 'Админские Telegram-уведомления',
      admin: {
        description:
          'Список пользователей, которым бот шлёт уведомления. Chat_id берётся из telegramId пользователя. Если пользователя нет в списке — добавьте его через кнопку «Добавить».',
      },
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
          required: true,
          admin: {
            description: 'Пользователь (должен иметь telegramId). Chat_id определяется автоматически.',
          },
        },
        {
          name: 'label',
          type: 'text',
          admin: {
            description: 'Отображаемое имя (по умолчанию — firstName из профиля). Опционально.',
          },
        },
        {
          name: 'notifyOn',
          type: 'group',
          label: 'Категории уведомлений',
          fields: [
            {
              name: 'contribution',
              type: 'checkbox',
              defaultValue: true,
              admin: { description: 'Подтверждённые взносы на события' },
            },
            {
              name: 'booking',
              type: 'checkbox',
              defaultValue: true,
              admin: { description: 'Новые и подтверждённые бронирования' },
            },
            {
              name: 'newEvent',
              type: 'checkbox',
              defaultValue: true,
              admin: { description: 'Новые опубликованные события' },
            },
            {
              name: 'rsvp',
              type: 'checkbox',
              defaultValue: false,
              admin: { description: 'Новые RSVP (ответы на события)' },
            },
          ],
        },
      ],
    },
  ],
}
