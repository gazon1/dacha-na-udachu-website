import type { Block } from 'payload'

/**
 * Block definitions — extracted from payload.config.ts to break circular imports
 * between payload.config.ts and collections/*.ts (which need these blocks).
 *
 * Slugs match the existing Wagtail StreamField names so the frontend
 * BlockRenderer can keep working unchanged.
 */

export const HeroBlock: Block = {
  slug: 'hero',
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 200 },
    { name: 'subtitle', type: 'textarea' },
    { name: 'buttonText', type: 'text', maxLength: 100 },
    { name: 'buttonUrl', type: 'text' },
  ],
}

export const FeaturesBlock: Block = {
  slug: 'features',
  fields: [
    { name: 'title', type: 'text', maxLength: 200 },
    {
      name: 'features',
      type: 'array',
      fields: [
        { name: 'icon', type: 'text', maxLength: 50 },
        { name: 'text', type: 'text', required: true, maxLength: 100 },
      ],
    },
  ],
}

export const ParagraphBlock: Block = {
  slug: 'paragraph',
  fields: [{ name: 'text', type: 'textarea', required: true }],
}

export const HeadingBlock: Block = {
  slug: 'heading',
  fields: [
    { name: 'text', type: 'text', required: true },
    { name: 'level', type: 'select', defaultValue: 'h2', options: ['h2', 'h3', 'h4'] },
  ],
}

export const ImageBlock: Block = {
  slug: 'image',
  fields: [
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    { name: 'caption', type: 'text', maxLength: 200 },
  ],
}

export const CTABlock: Block = {
  slug: 'cta',
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 200 },
    { name: 'description', type: 'textarea' },
    { name: 'buttonText', type: 'text', maxLength: 100 },
    { name: 'buttonUrl', type: 'text' },
  ],
}

export const NewsletterBlock: Block = {
  slug: 'newsletter',
  fields: [
    { name: 'title', type: 'text', defaultValue: 'Подпишитесь на новости', maxLength: 200 },
    { name: 'description', type: 'textarea' },
  ],
}

export const FAQItemBlock: Block = {
  slug: 'faqItem',
  fields: [
    { name: 'question', type: 'text', required: true, maxLength: 200 },
    { name: 'answer', type: 'textarea', required: true },
  ],
}

export const AmenityItemBlock: Block = {
  slug: 'amenityItem',
  fields: [
    { name: 'icon', type: 'text', defaultValue: 'check', maxLength: 50 },
    { name: 'label', type: 'text', required: true, maxLength: 100 },
  ],
}

export const InfoCardBlock: Block = {
  slug: 'infoCard',
  fields: [
    { name: 'icon', type: 'text', defaultValue: 'info', maxLength: 50 },
    { name: 'title', type: 'text', required: true },
    { name: 'content', type: 'textarea' },
  ],
}

export const CtaCardBlock: Block = {
  slug: 'ctaCard',
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 100 },
    { name: 'text', type: 'textarea' },
    { name: 'highlighted', type: 'checkbox', defaultValue: true },
  ],
}