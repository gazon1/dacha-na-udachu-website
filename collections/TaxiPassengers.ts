import type { CollectionConfig } from 'payload'

/**
 * TaxiPassengers collection — passengers in shared taxis.
 *
 * Replaces events.TaxiPassenger.
 */
export const TaxiPassengers: CollectionConfig = {
  slug: 'taxi-passengers',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['taxi', 'name', 'seats'],
    enableListViewSelectAPI: true,
    pagination: { defaultLimit: 50, limits: [25, 50, 100, 250] },
    listSearchableFields: ['name', 'telegram', 'phone'],
    description: 'Пассажиры, записавшиеся в общий такси-пул.',
    group: 'Заявки',
  },
  access: {
    // Public CRUD for now — Phase 5 will tighten.
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'taxi',
      type: 'relationship',
      relationTo: 'taxi-pools',
      required: true,
      index: true,
    },
    { name: 'name', type: 'text', required: true, maxLength: 100 },
    { name: 'telegram', type: 'text', maxLength: 100 },
    { name: 'phone', type: 'text', maxLength: 50 },
    { name: 'seats', type: 'number', defaultValue: 1, min: 1 },
    { name: 'notes', type: 'textarea' },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
    },
  ],
}