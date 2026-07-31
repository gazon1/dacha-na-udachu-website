import type { CollectionConfig } from 'payload'
import { isAdmin } from '../lib/access'

/**
 * Media collection — uploaded files (images, documents).
 *
 * Replaces wagtail.images.Image + wagtail.documents.Document collections.
 * Images are auto-resized via sharp (configured in payload.config.ts).
 */
export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    useAsTitle: 'filename',
    enableListViewSelectAPI: true,
    pagination: { defaultLimit: 25, limits: [10, 25, 50, 100] },
    listSearchableFields: ['alt', 'caption', 'filename'],
    description: 'Загруженные медиа-файлы (картинки, PDF, видео).',
    group: 'Контент',
  },
  // Public read; admin-only writes.
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  upload: {
    staticDir: 'media', // relative to project root; Drizzle writes here
    imageSizes: [
      { name: 'thumbnail', width: 300, height: 300, position: 'centre' },
      { name: 'card', width: 768 },
      { name: 'hero', width: 1920, height: 1080, position: 'centre' },
    ],
    mimeTypes: ['image/*', 'application/pdf', 'video/mp4'],
    adminThumbnail: 'thumbnail',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      maxLength: 200,
      admin: { description: 'Alt-text для доступности (обязательно)' },
    },
    { name: 'caption', type: 'text', maxLength: 500 },
  ],
}