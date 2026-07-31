import type { CollectionConfig } from 'payload'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'

import { adminOrPublished, isAdmin } from '../lib/access'
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
    enableListViewSelectAPI: true,
    pagination: { defaultLimit: 25, limits: [10, 25, 50, 100] },
    listSearchableFields: ['title', 'author', 'summary'],
    description: 'Новости и анонсы.',
    group: 'Контент',
    livePreview: {
      url: ({ data }) => `/news/${data?.slug ?? ''}`,
      breakpoints: [
        { name: 'mobile', width: 375, height: 667, label: 'Mobile' },
        { name: 'tablet', width: 768, height: 1024, label: 'Tablet' },
        { name: 'desktop', width: 1440, height: 900, label: 'Desktop' },
      ],
    },
  },
  forceSelect: { body: true },
  access: {
    // Anonymous: published only. Admin: everything.
    read: adminOrPublished,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  versions: {
    drafts: { autosave: true },
    maxPerDoc: 25,
  },
  hooks: {
    afterChange: [
      ({ doc }) => {
        // `unstable_after` runs after the current request response is sent,
        // so revalidatePath is never called during render — Next.js 15
        // forbids revalidatePath during render. setImmediate() is NOT enough
        // because Next.js still tracks render context across the event-loop tick.
        after(() => {
          revalidatePath('/news')
          revalidatePath(`/news/${doc.slug}`)
        })
      },
    ],
    afterDelete: [
      ({ doc }) => {
        after(() => {
          revalidatePath('/news')
          revalidatePath(`/news/${doc.slug}`)
        })
      },
    ],
  },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true, index: true, maxLength: 100 },
    { name: 'title', type: 'text', required: true, maxLength: 200 },
    { name: 'date', type: 'date', required: true, index: true },
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