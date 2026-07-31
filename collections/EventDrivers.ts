import type { CollectionConfig } from 'payload'
import { isAdminOrOwner } from '../lib/access'

/**
 * EventDrivers collection — carpool driver offers.
 *
 * Replaces events.EventDriver.
 */
export const EventDrivers: CollectionConfig = {
  slug: 'event-drivers',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['event', 'name', 'departureDate', 'seatsTotal'],
    enableListViewSelectAPI: true,
    pagination: { defaultLimit: 50, limits: [25, 50, 100, 250] },
    listSearchableFields: ['name', 'telegram', 'phone', 'carModel', 'departureLocation'],
    description: 'Водители, готовые подвезти участников на событие.',
    group: 'Заявки',
  },
  // Public read (so passengers can browse drivers). Writes via secret token
  // holder or admin.
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
    { name: 'name', type: 'text', required: true, maxLength: 100 },
    { name: 'telegram', type: 'text', maxLength: 100 },
    { name: 'phone', type: 'text', maxLength: 50 },
    { name: 'carModel', type: 'text', maxLength: 100 },
    { name: 'carType', type: 'text', maxLength: 50 },
    { name: 'seatsTotal', type: 'number', defaultValue: 4, min: 1 },
    { name: 'departureDate', type: 'date', required: true, index: true },
    { name: 'departureTime', type: 'text', maxLength: 20 },
    { name: 'departureLocation', type: 'text', required: true, maxLength: 200 },
    { name: 'returnDate', type: 'date' },
    { name: 'returnTime', type: 'text', maxLength: 20 },
    { name: 'notes', type: 'textarea' },
    {
      name: 'contactPreference',
      type: 'select',
      defaultValue: 'both',
      options: [
        { label: 'Telegram', value: 'telegram' },
        { label: 'Phone', value: 'phone' },
        { label: 'Both', value: 'both' },
      ],
    },
    { name: 'isVerified', type: 'checkbox', defaultValue: false },
    { name: 'isCancelled', type: 'checkbox', defaultValue: false },
    {
      name: 'cancelToken',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Auto-generated UUID for cancel-by-token' },
    },
  ],
}