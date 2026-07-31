import type { CollectionConfig } from 'payload'

/**
 * ExtraServices collection — bookable add-ons (banya, manhal, fishing, etc).
 *
 * Replaces core.ExtraService. Pricing stored per-service; booking quotes
 * snapshot these in Bookings.options.
 */
export const ExtraServices: CollectionConfig = {
  slug: 'extra-services',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'price', 'isActive', 'order'],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true, index: true, maxLength: 50 },
    { name: 'name', type: 'text', required: true, maxLength: 100 },
    { name: 'price', type: 'number', defaultValue: 0, min: 0 },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
    { name: 'order', type: 'number', defaultValue: 0 },
  ],
}