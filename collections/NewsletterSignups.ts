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
  },
  access: {
    read: () => true,
    create: () => true,
  },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true, index: true },
    { name: 'subscribedAt', type: 'date', required: true },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
    { name: 'ipAddress', type: 'text', maxLength: 64 },
  ],
}