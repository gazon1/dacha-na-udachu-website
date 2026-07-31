import type { CollectionConfig } from 'payload'
import { isAdminOrOwner } from '../lib/access'

/**
 * TaxiPools collection — shared taxi rides.
 *
 * Replaces events.TaxiPool.
 */
export const TaxiPools: CollectionConfig = {
  slug: 'taxi-pools',
  admin: {
    useAsTitle: 'organizer',
    defaultColumns: ['event', 'organizer', 'departureDate', 'maxPassengers'],
    enableListViewSelectAPI: true,
    pagination: { defaultLimit: 50, limits: [25, 50, 100, 250] },
    listSearchableFields: ['organizer', 'telegram', 'pickupLocation'],
    description: 'Объединённые поездки на такси (Yandex, Citymobil и др.).',
    group: 'Заявки',
  },
  access: {
    read: () => true,
    create: () => true,
    update: isAdminOrOwner,
    delete: isAdminOrOwner,
  },
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      index: true,
    },
    { name: 'organizer', type: 'text', required: true, maxLength: 100 },
    { name: 'telegram', type: 'text', maxLength: 100 },
    { name: 'pickupLocation', type: 'text', required: true, maxLength: 200 },
    { name: 'departureDate', type: 'date', required: true, index: true },
    { name: 'departureTime', type: 'text', required: true, maxLength: 20 },
    { name: 'maxPassengers', type: 'number', defaultValue: 4, min: 1 },
    { name: 'estimatedPrice', type: 'text', maxLength: 100 },
    {
      name: 'service',
      type: 'select',
      defaultValue: 'other',
      options: [
        { label: 'Yandex', value: 'yandex' },
        { label: 'Citymobil', value: 'citymobil' },
        { label: 'Other', value: 'other' },
      ],
    },
    { name: 'notes', type: 'textarea' },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
    },
  ],
}