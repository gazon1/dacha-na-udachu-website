import type { CollectionConfig } from 'payload'

/**
 * CarpoolRequests collection — "looking for a ride" requests.
 *
 * Replaces events.CarpoolRequest.
 */
export const CarpoolRequests: CollectionConfig = {
  slug: 'carpool-requests',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['event', 'name', 'seatsNeeded', 'isActive'],
    enableListViewSelectAPI: true,
    pagination: { defaultLimit: 50, limits: [25, 50, 100, 250] },
    listSearchableFields: ['name', 'telegram', 'phone', 'pickupLocation'],
    description: 'Запросы «ищу попутку» — кто не может быть водителем.',
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
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      index: true,
    },
    { name: 'name', type: 'text', required: true, maxLength: 100 },
    { name: 'telegram', type: 'text', maxLength: 100 },
    { name: 'phone', type: 'text', maxLength: 50 },
    { name: 'pickupLocation', type: 'text', maxLength: 200 },
    { name: 'seatsNeeded', type: 'number', defaultValue: 1, min: 1 },
    { name: 'flexibleTime', type: 'checkbox', defaultValue: true },
    { name: 'canShareGas', type: 'checkbox', defaultValue: false },
    { name: 'notes', type: 'textarea' },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
    },
  ],
}