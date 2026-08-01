import type { CollectionConfig } from 'payload'
import { adminOrPublished, isAdmin } from '../lib/access'
import { revalidateAfter } from '../lib/revalidate'
import { ParagraphBlock, FAQItemBlock } from './blocks'

/**
 * FAQ collection — frequently asked questions.
 *
 * Replaces faq.FAQPage (the whole page is one FAQ document with an array of
 * Q&A items). Used as a single-instance record (slug "faq").
 */
export const FAQ: CollectionConfig = {
  slug: 'faq',
  admin: {
    useAsTitle: 'title',
    enableListViewSelectAPI: true,
    pagination: { defaultLimit: 10, limits: [10, 25, 50] },
    description: 'Страница FAQ — обычно один документ со slug "faq".',
    group: 'Контент',
  },
  access: {
    read: adminOrPublished,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  versions: {
    drafts: { autosave: true },
    maxPerDoc: 5,
  },
  hooks: {
    afterChange: [
      () => {
        revalidateAfter('/faq')
      },
    ],
  },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true, defaultValue: 'faq', index: true },
    { name: 'title', type: 'text', required: true, defaultValue: 'Вопросы и ответы' },
    {
      name: 'intro',
      type: 'blocks',
      blocks: [ParagraphBlock],
    },
    {
      name: 'faqItems',
      type: 'array',
      minRows: 1,
      fields: [
        { name: 'question', type: 'text', required: true, maxLength: 200 },
        { name: 'answer', type: 'textarea', required: true },
      ],
    },
  ],
}