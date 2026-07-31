import type { CollectionConfig } from 'payload'
import { revalidatePath } from 'next/cache'

import { HeadingBlock, ParagraphBlock, ImageBlock } from './blocks'

/**
 * News collection — news articles.
 *
 * Replaces news.NewsPage. Pagination handled client-side or via Payload's
 * built-in ?page= query parameter.
 */
export const News: CollectionConfig = {
  slug: 'news',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'author'],
    livePreview: {
      url: ({ data }) => `/news/${data?.slug ?? ''}`,
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
          revalidatePath('/news')
          revalidatePath(`/news/${doc.slug}`)
        })
      },
    ],
    afterDelete: [
      ({ doc }) => {
        setImmediate(() => {
          revalidatePath('/news')
          revalidatePath(`/news/${doc.slug}`)
        })
      },
    ],
  },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true, index: true, maxLength: 100 },
    { name: 'title', type: 'text', required: true, maxLength: 200 },
    { name: 'date', type: 'date', required: true },
    { name: 'author', type: 'text', maxLength: 100 },
    {
      name: 'mainImage',
      type: 'upload',
      relationTo: 'media',
    },
    { name: 'summary', type: 'textarea' },
    {
      name: 'body',
      type: 'blocks',
      blocks: [HeadingBlock, ParagraphBlock, ImageBlock],
    },
  ],
}