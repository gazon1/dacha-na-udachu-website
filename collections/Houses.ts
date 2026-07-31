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
    livePreview: {
      url: ({ data }) => `/houses/${data?.slug ?? ''}`,
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
        // Trigger Next.js revalidation for the list + detail pages.
        revalidatePath('/houses')
        revalidatePath(`/houses/${doc.slug}`)
      },
    ],
    afterDelete: [
      ({ doc }) => {
        revalidatePath('/houses')
        revalidatePath(`/houses/${doc.slug}`)
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
    { name: 'basePrice', type: 'number', defaultValue: 0, min: 0 },
    { name: 'bookingEnabled', type: 'checkbox', defaultValue: true },
    {
      name: 'body',
      type: 'blocks',
      blocks: [HeadingBlock, ParagraphBlock, ImageBlock],
    },
  ],
}