import type { CollectionConfig } from 'payload'
import { revalidatePath } from 'next/cache'

import {
  HeadingBlock,
  ParagraphBlock,
  ImageBlock,
  InfoCardBlock,
  FAQItemBlock,
  CtaCardBlock,
  AmenityItemBlock,
} from './blocks'

/**
 * Events collection — events with RSVP, carpool, taxi.
 *
 * Replaces events.EventPage. RSVP/carpool/taxi are SEPARATE collections
 * with `event` relationship (cleaner than inline panels).
 */
export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'startDate', 'venue', 'rsvpCapacity'],
    livePreview: {
      url: ({ data }) => `/events/${data?.slug ?? ''}`,
    },
  },
  access: {
    read: () => true,
  },
  versions: {
    drafts: { autosave: true },
    maxPerDoc: 25,
  },
  hooks: {
    afterChange: [
      ({ doc }) => {
        // Deferred via setImmediate so revalidatePath runs in the next event-loop
        // tick (after the current render finishes), not synchronously during admin
        // render — Next.js 15 forbids revalidatePath during render.
        setImmediate(() => {
          revalidatePath('/events')
          revalidatePath(`/events/${doc.slug}`)
        })
      },
    ],
    afterDelete: [
      ({ doc }) => {
        setImmediate(() => {
          revalidatePath('/events')
          revalidatePath(`/events/${doc.slug}`)
        })
      },
    ],
  },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true, index: true, maxLength: 100 },
    { name: 'title', type: 'text', required: true, maxLength: 200 },
    { name: 'startDate', type: 'date', required: true },
    { name: 'endDate', type: 'date' },
    { name: 'startTime', type: 'text', maxLength: 20 }, // simple "HH:MM" or null
    { name: 'venue', type: 'textarea' },
    { name: 'venueNotes', type: 'textarea' },
    { name: 'mapLink', type: 'text' },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
    },
    { name: 'summary', type: 'textarea' },
    { name: 'showCountdown', type: 'checkbox', defaultValue: false },
    { name: 'expectedTemperature', type: 'text', maxLength: 20 },
    { name: 'weatherNote', type: 'text', maxLength: 100 },
    { name: 'specialTag', type: 'text', maxLength: 50 },
    { name: 'rsvpCapacity', type: 'number', min: 1 },
    {
      name: 'body',
      type: 'blocks',
      blocks: [
        HeadingBlock,
        ParagraphBlock,
        ImageBlock,
        InfoCardBlock,
        FAQItemBlock,
        CtaCardBlock,
        AmenityItemBlock,
      ],
    },
  ],
}