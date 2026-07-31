import type { CollectionConfig } from 'payload'
import { newsletterEndpoints } from './endpoints/newsletter'

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
    description: 'PII — подписчики на рассылку. Подписка через /api/newsletter-signups/subscribe.',
    group: 'Заявки',
  },
  // Public write only via custom endpoint — direct collection CRUD is admin-only.
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  endpoints: newsletterEndpoints,
  fields: [
    { name: 'email', type: 'email', required: true, unique: true, index: true },
    { name: 'subscribedAt', type: 'date', required: true },
    { name: 'isActive', type: 'checkbox', defaultValue: true, index: true },
    { name: 'ipAddress', type: 'text', maxLength: 64 },
  ],
}