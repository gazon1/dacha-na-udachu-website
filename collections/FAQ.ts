import type { CollectionConfig } from 'payload'
import { revalidatePath } from 'next/cache'

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
  },
  access: {
    read: () => true,
  },
  versions: {
    drafts: { autosave: true },
  },
  hooks: {
    afterChange: [
      () => {
        revalidatePath('/faq')
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