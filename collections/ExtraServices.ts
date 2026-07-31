import type { CollectionConfig } from 'payload'
import { isAdmin } from '../lib/access'

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
    enableListViewSelectAPI: true,
    pagination: { defaultLimit: 25, limits: [10, 25, 50, 100] },
    listSearchableFields: ['name', 'slug'],
    description: 'Дополнительные услуги (баня, мангал, рыбалка и т.п.).',
    group: 'Справочники',
  },
  // Public read on the frontend. Only admin writes.
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true, index: true, maxLength: 50 },
    { name: 'name', type: 'text', required: true, maxLength: 100 },
    { name: 'price', type: 'number', defaultValue: 0, min: 0 },
    { name: 'isActive', type: 'checkbox', defaultValue: true, index: true },
    { name: 'order', type: 'number', defaultValue: 0, index: true },
  ],
}