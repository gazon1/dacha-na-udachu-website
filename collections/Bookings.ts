import type { CollectionConfig } from 'payload'

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
  },
  access: {
    read: () => true, // public read for now; restrict to admin later
    create: () => true, // public submission via /api/booking/submit endpoint
  },
  fields: [
    {
      name: 'house',
      type: 'relationship',
      relationTo: 'houses',
      required: true,
    },
    { name: 'checkIn', type: 'date', required: true },
    { name: 'checkOut', type: 'date', required: true },
    { name: 'name', type: 'text', required: true, maxLength: 255 },
    { name: 'phone', type: 'text', required: true, maxLength: 50 },
    { name: 'telegram', type: 'text', maxLength: 255 },
    { name: 'guestNum', type: 'number', defaultValue: 1, min: 1 },
    { name: 'isConfirmed', type: 'checkbox', defaultValue: false },
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
  ],
}