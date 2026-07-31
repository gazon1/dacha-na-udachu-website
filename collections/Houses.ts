import type { CollectionConfig } from 'payload'
import { revalidatePath } from 'next/cache'

import { HeadingBlock, ParagraphBlock, ImageBlock } from './blocks'

/**
 * Houses collection — bookable houses.
 *
 * Replaces houses.HousePage + houses.HousesIndexPage from Wagtail.
 * The "index" page concept is dropped: the index route just lists all Houses
 * via payload.find() — no separate page needed.
 */
export const Houses: CollectionConfig = {
  slug: 'houses',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'capacity', 'bedrooms', 'basePrice', 'bookingEnabled'],
    enableListViewSelectAPI: true,
    pagination: { defaultLimit: 25, limits: [10, 25, 50, 100] },
    listSearchableFields: ['title', 'summary', 'address'],
    description: 'Объекты размещения с возможностью онлайн-бронирования.',
    group: 'Контент',
    livePreview: {
      url: ({ data }) => `/houses/${data?.slug ?? ''}`,
      breakpoints: [
        { name: 'mobile', width: 375, height: 667, label: 'Mobile' },
        { name: 'tablet', width: 768, height: 1024, label: 'Tablet' },
        { name: 'desktop', width: 1440, height: 900, label: 'Desktop' },
      ],
    },
  },
  // ensure all hooks always receive the full body, even when callers use select
  forceSelect: { body: true },
  // When other collections (e.g. Bookings, EventRsvps) populate a House,
  // only fetch these fields by default. Saves payload on every read.
  // Override per-query with `populate` if you need more.
  defaultPopulate: {
    title: true,
    slug: true,
    basePrice: true,
    capacity: true,
    bookingEnabled: true,
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
        // Trigger Next.js revalidation for the list + detail pages.
        // Deferred via setImmediate so revalidatePath runs in the next event-loop
        // tick (after the current render finishes), not synchronously during admin
        // render — Next.js 15 forbids revalidatePath during render.
        setImmediate(() => {
          revalidatePath('/houses')
          revalidatePath(`/houses/${doc.slug}`)
        })
      },
    ],
    afterDelete: [
      ({ doc }) => {
        setImmediate(() => {
          revalidatePath('/houses')
          revalidatePath(`/houses/${doc.slug}`)
        })
      },
    ],
  },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true, index: true, maxLength: 100 },
    { name: 'title', type: 'text', required: true, maxLength: 200 },
    { name: 'summary', type: 'text', maxLength: 255 },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
    },
    { name: 'capacity', type: 'number', defaultValue: 1, min: 1, max: 1000 },
    { name: 'bedrooms', type: 'number', defaultValue: 1, min: 0, max: 50 },
    { name: 'address', type: 'text', maxLength: 255 },
    {
      name: 'basePrice',
      type: 'number',
      defaultValue: 0,
      min: 0,
      index: true,
      admin: { description: 'Базовая цена за ночь в рублях' },
    },
    {
      name: 'bookingEnabled',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: { description: 'Можно ли бронировать этот дом через сайт' },
    },
    {
      name: 'body',
      type: 'blocks',
      blocks: [HeadingBlock, ParagraphBlock, ImageBlock],
    },
  ],
}