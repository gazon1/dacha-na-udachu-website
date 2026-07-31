import type { CollectionConfig } from 'payload'
import { eventsRsvpEndpoints } from './endpoints/events-rsvp'

/**
 * EventRsvps collection — RSVPs for events.
 *
 * Replaces events.EventRSVP. Capacity enforcement and waiting list logic
 * belongs in `beforeChange` hooks (TODO if user needs strict capacity).
 */
export const EventRsvps: CollectionConfig = {
  slug: 'event-rsvps',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['event', 'name', 'status', 'guestsCount', 'secretKey'],
    enableListViewSelectAPI: true,
    pagination: { defaultLimit: 50, limits: [25, 50, 100, 250] },
    listSearchableFields: ['name', 'secretKey'],
    description: 'RSVP на события — создаются через /api/event-rsvps/submit.',
    group: 'Заявки',
  },
  // Public CRUD only via custom endpoints — direct collection CRUD is admin-only.
  access: {
    read: () => true,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  endpoints: eventsRsvpEndpoints,
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      index: true,
    },
    { name: 'name', type: 'text', required: true, maxLength: 100 },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'going',
      index: true,
      options: [
        { label: 'Going', value: 'going' },
        { label: 'Maybe', value: 'maybe' },
        { label: 'Not going', value: 'not_going' },
        { label: 'Waiting', value: 'waiting' },
      ],
    },
    { name: 'guestsCount', type: 'number', defaultValue: 1, min: 1 },
    {
      name: 'secretKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Random UUID; used as identifier in cookies' },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      admin: { description: 'Optional Telegram user link (for "save RSVP" feature)' },
    },
    {
      // Virtual — human-readable summary string for admin and dashboards.
      name: 'attendeeSummary',
      type: 'text',
      virtual: true,
      access: { read: () => true },
      hooks: {
        afterRead: [
          ({ siblingData }) => {
            const name = (siblingData?.name as string) ?? ''
            const guests = (siblingData?.guestsCount as number) ?? 1
            if (guests > 1) return `${name} + ${guests - 1} гостя`
            return name
          },
        ],
      },
    },
  ],
}