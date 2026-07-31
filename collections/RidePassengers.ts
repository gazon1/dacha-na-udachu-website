import type { CollectionConfig } from 'payload'

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
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'driver',
      type: 'relationship',
      relationTo: 'event-drivers',
      required: true,
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
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
  ],
}