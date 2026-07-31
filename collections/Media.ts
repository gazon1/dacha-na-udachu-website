import type { CollectionConfig } from 'payload'

/**
 * Media collection — uploaded files (images, documents).
 *
 * Replaces wagtail.images.Image + wagtail.documents.Document collections.
 * Images are auto-resized via sharp (configured in payload.config.ts).
 */
export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true, // public read; restrict via signed URLs if needed
  },
  upload: {
    staticDir: 'media', // relative to project root; Drizzle writes here
    imageSizes: [
      { name: 'thumbnail', width: 300, height: 300, position: 'centre' },
      { name: 'card', width: 768 },
      { name: 'hero', width: 1920, height: 1080, position: 'centre' },
    ],
    mimeTypes: ['image/*', 'application/pdf', 'video/mp4'],
  },
  fields: [
    { name: 'alt', type: 'text', required: true, maxLength: 200 },
    { name: 'caption', type: 'text', maxLength: 500 },
  ],
}