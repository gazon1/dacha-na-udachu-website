import type { CollectionConfig } from 'payload'
import { bookingEndpoints } from './endpoints/booking'

/**
 * Bookings collection — booking requests for houses.
 *
 * Replaces booking.Booking from Django. Pricing fields are snapshotted at
 * booking time so historical bookings don't drift if rates change.
 */
export const Bookings: CollectionConfig = {
  slug: 'bookings',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'house', 'checkIn', 'checkOut', 'isConfirmed', 'totalPrice'],
    enableListViewSelectAPI: true,
    pagination: { defaultLimit: 25, limits: [10, 25, 50, 100] },
    listSearchableFields: ['name', 'phone', 'telegram'],
    description: 'PII — заявки на бронирование. Создаются через /api/bookings/submit.',
    group: 'Заявки',
  },
  // Public submit only via custom endpoints — direct collection CRUD is admin-only.
  access: {
    read: () => true,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  endpoints: bookingEndpoints,
  fields: [
    {
      name: 'house',
      type: 'relationship',
      relationTo: 'houses',
      required: true,
    },
    { name: 'checkIn', type: 'date', required: true, index: true },
    { name: 'checkOut', type: 'date', required: true, index: true },
    { name: 'name', type: 'text', required: true, maxLength: 255 },
    { name: 'phone', type: 'text', required: true, maxLength: 50 },
    { name: 'telegram', type: 'text', maxLength: 255 },
    { name: 'guestNum', type: 'number', defaultValue: 1, min: 1 },
    { name: 'isConfirmed', type: 'checkbox', defaultValue: false, index: true },
    {
      name: 'options',
      type: 'json',
      defaultValue: {},
      admin: { description: 'Selected extra services at booking time' },
    },
    { name: 'basePrice', type: 'number', defaultValue: 0 },
    { name: 'extrasPrice', type: 'number', defaultValue: 0 },
    { name: 'totalPrice', type: 'number', defaultValue: 0 },
    { name: 'notes', type: 'textarea' },
    {
      // Virtual field — computed on read, never stored in DB.
      name: 'totalNights',
      type: 'number',
      virtual: true,
      access: { read: () => true },
      hooks: {
        afterRead: [
          ({ siblingData }) => {
            if (!siblingData?.checkIn || !siblingData?.checkOut) return 0
            const ms =
              new Date(siblingData.checkOut).getTime() -
              new Date(siblingData.checkIn).getTime()
            return Math.max(0, Math.ceil(ms / 86_400_000))
          },
        ],
      },
    },
  ],
}