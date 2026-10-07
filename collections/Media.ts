import type { CollectionConfig } from 'payload'
import { isAdmin } from '../lib/access'

/**
 * Upload size limits.
 *
 * Payload's `upload` options in the installed version have no `maxFileSize`
 * field, so `mimeTypes` is the only thing bounding an upload — type, not size.
 * Without an explicit check, `video/mp4` is effectively "any size": a single
 * multi-gigabyte file would be written to the volume and processed by sharp.
 *
 * Enforced in `beforeChange` because that runs on create AND update, for both
 * the admin UI and the REST API, and reads the real byte count Payload already
 * stores on the file object.
 */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024 // 200 MB
const MAX_DOC_BYTES = 25 * 1024 * 1024 // 25 MB

function limitFor(mimeType: string | null | undefined): number {
  if (mimeType?.startsWith('video/')) return MAX_VIDEO_BYTES
  if (mimeType === 'application/pdf') return MAX_DOC_BYTES
  return MAX_IMAGE_BYTES
}

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
  hooks: {
    beforeChange: [
      ({ data }) => {
        const file = data?.files?.file as { size?: number; mimeType?: string } | undefined
        if (!file || typeof file.size !== 'number') return data

        const max = limitFor(file.mimeType)
        if (file.size > max) {
          const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(0)
          throw new Error(
            `Файл слишком большой: ${mb(file.size)} МБ при лимите ${mb(max)} МБ ` +
              `для типа ${file.mimeType ?? 'unknown'}.`,
          )
        }
        return data
      },
    ],
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