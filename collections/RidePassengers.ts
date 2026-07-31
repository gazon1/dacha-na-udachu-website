import type { CollectionConfig } from 'payload'
import { isAdminOrOwner } from '../lib/access'

/**
 * RidePassengers collection — passengers in driver cars.
 *
 * Replaces events.RidePassenger.
 */
export const RidePassengers: CollectionConfig = {
  slug: 'ride-passengers',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['driver', 'name', 'seats', 'status'],
    enableListViewSelectAPI: true,
    pagination: { defaultLimit: 50, limits: [25, 50, 100, 250] },
    listSearchableFields: ['name', 'telegram', 'phone'],
    description: 'Пассажиры, записавшиеся к водителю.',
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
      name: 'driver',
      type: 'relationship',
      relationTo: 'event-drivers',
      required: true,
      index: true,
    },
    { name: 'name', type: 'text', required: true, maxLength: 100 },
    { name: 'telegram', type: 'text', maxLength: 100 },
    { name: 'phone', type: 'text', maxLength: 50 },
    { name: 'seats', type: 'number', defaultValue: 1, min: 1 },
    { name: 'pickupLocation', type: 'text', maxLength: 200 },
    { name: 'notes', type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
  ],
}