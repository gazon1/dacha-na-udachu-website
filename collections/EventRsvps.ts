import type { CollectionConfig } from 'payload'

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
    description: 'RSVP на события — создаются через /api/events/:id/rsvp.',
    group: 'Заявки',
  },
  access: {
    // Public CRUD for now — Phase 5 will tighten to isAdmin / isAdminOrOwner.
    read: () => true,
    create: () => true,
    update: () => true, // RSVP updates via secret_key
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