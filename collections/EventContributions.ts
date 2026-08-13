import type { CollectionConfig } from 'payload'
import { eventContributionEndpoints } from './endpoints/event-contributions'
import { revalidateAfter } from '../lib/revalidate'

/**
 * EventContributions — voluntary contributions ("скинуться на дачу") for events.
 *
 * No direct Payload API access — all writes go through custom endpoints
 * (which set the contrib cookie and use secretKey for ownership). Public
 * read of confirmed contributions is exposed via the custom
 * GET /api/event-contributions/summary/:slug endpoint.
 *
 * Payment reconciliation is automatic via YooMoney webhook + cron fallback;
 * no manual admin approval is required for MVP.
 */
export const EventContributions: CollectionConfig = {
  slug: 'event-contributions',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['event', 'name', 'amount', 'status', 'confirmedAt'],
    enableListViewSelectAPI: true,
    pagination: { defaultLimit: 50, limits: [25, 50, 100, 250] },
    listSearchableFields: ['name', 'secretKey'],
    description: 'Добровольные взносы на события — создаются через /api/event-contributions/submit.',
    group: 'Заявки',
  },
  access: {
    // Everything is closed — public data goes through /summary, writes through
    // /submit and /yoomoney-notification.
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  endpoints: eventContributionEndpoints,
  hooks: {
    afterChange: [
      async ({ doc, req, operation, previousDoc }) => {
        // Revalidate the event page when a contribution is confirmed, so the
        // public widget shows the new total without a full page reload.
        const wasConfirmed = previousDoc?.status !== 'confirmed' && doc.status === 'confirmed'
        if (wasConfirmed && doc.event) {
          try {
            const event = await req.payload.findByID({
              collection: 'events',
              id: doc.event,
              depth: 0,
              overrideAccess: true,
            })
            if (event?.slug) {
              revalidateAfter(`/events/${event.slug}`)
            }
          } catch {
            // Event might have been deleted — silently skip.
          }
        }
        void operation
      },
    ],
  },
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      index: true,
    },
    { name: 'name', type: 'text', required: true, maxLength: 100 },
    {
      name: 'amount',
      type: 'number',
      required: true,
      min: 1,
      max: 1_000_000,
      admin: { description: 'Сумма взноса в рублях (на момент создания)' },
    },
    {
      name: 'message',
      type: 'text',
      maxLength: 200,
      admin: { description: 'Опциональное сообщение от гостя' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Expired', value: 'expired' },
      ],
      admin: { description: 'pending → confirmed после сверки webhook/cron' },
    },
    {
      name: 'secretKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'UUID, используется как label в quickpay-ссылке и для сопоставления платежа' },
    },
    {
      name: 'yoomoneyOperationId',
      type: 'text',
      index: true,
      admin: { description: 'ID операции из ЮMoney (заполняется при подтверждении)' },
    },
    {
      name: 'confirmedAt',
      type: 'date',
      index: true,
      admin: { description: 'Когда платёж был подтверждён' },
    },
    {
      name: 'senderFirstname',
      type: 'text',
      admin: { description: 'Имя отправителя из webhook (если HTTPS + запрошены контакты)' },
    },
    {
      name: 'senderLastname',
      type: 'text',
      admin: { description: 'Фамилия отправителя из webhook' },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      admin: { description: 'Опциональная привязка к Telegram-пользователю (на будущее)' },
    },
    {
      // Virtual — display-friendly summary for admin lists / dashboards.
      name: 'contributionSummary',
      type: 'text',
      virtual: true,
      access: { read: () => true },
      hooks: {
        afterRead: [
          ({ siblingData }) => {
            const name = (siblingData?.name as string) ?? ''
            const amount = (siblingData?.amount as number) ?? 0
            return `${name} — ${amount.toLocaleString('ru-RU')} ₽`
          },
        ],
      },
    },
  ],
}