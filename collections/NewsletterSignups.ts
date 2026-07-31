import type { CollectionConfig } from 'payload'

/**
 * NewsletterSignups collection — email subscriptions.
 *
 * Replaces core.NewsletterSignup.
 */
export const NewsletterSignups: CollectionConfig = {
  slug: 'newsletter-signups',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'subscribedAt', 'isActive'],
    enableListViewSelectAPI: true,
    pagination: { defaultLimit: 50, limits: [25, 50, 100, 250] },
    listSearchableFields: ['email'],
    description: 'PII — подписчики на рассылку. Сколько будет только admin.',
    group: 'Заявки',
  },
  access: {
    // Public write (anyone can subscribe); read/update/delete — admin only (Phase 5).
    read: () => false,
    create: () => true,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true, index: true },
    { name: 'subscribedAt', type: 'date', required: true },
    { name: 'isActive', type: 'checkbox', defaultValue: true, index: true },
    { name: 'ipAddress', type: 'text', maxLength: 64 },
  ],
}