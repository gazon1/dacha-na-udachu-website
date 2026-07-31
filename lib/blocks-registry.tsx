/**
 * Block renderers for Payload blocks.
 *
 * The block shape from Payload (array of `{blockType, fields}` or `{type, value}`
 * depending on version) is normalized to `{type, value}` for backward
 * compatibility with the existing Wagtail StreamField JSON shape — so the
 * existing `components/blocks/*.tsx` components keep working without changes.
 */

import { Fragment, type ReactNode } from 'react'
import { HeroBlock } from '@/components/blocks/HeroBlock'
import { FeaturesBlock } from '@/components/blocks/FeaturesBlock'
import { ParagraphBlock } from '@/components/blocks/ParagraphBlock'
import { HeadingBlock } from '@/components/blocks/HeadingBlock'
import { ImageBlock } from '@/components/blocks/ImageBlock'
import { CTABlock } from '@/components/blocks/CTABlock'
import { NewsletterFormBlock } from '@/components/blocks/NewsletterFormBlock'
import { FaqBlock } from '@/components/blocks/FaqBlock'
import { AmenityItemBlock } from '@/components/blocks/AmenityItemBlock'
import { InfoCardBlock } from '@/components/blocks/InfoCardBlock'
import { CtaCardBlock } from '@/components/blocks/CtaCardBlock'

export type PayloadBlock = {
  blockType?: string
  type?: string
  fields?: Record<string, unknown>
  value?: unknown
  id?: string
}

type RendererFn = (block: PayloadBlock) => ReactNode
type Renderer = RendererFn & { displayName?: string }

const registry: Record<string, Renderer> = {
  hero: (b) => <HeroBlock value={(b.fields ?? b.value) as any} />,
  features: (b) => <FeaturesBlock value={(b.fields ?? b.value) as any} />,
  paragraph: (b) => <ParagraphBlock value={(b.fields ?? b.value) as any} />,
  heading: (b) => <HeadingBlock value={(b.fields ?? b.value) as any} />,
  image: (b) => <ImageBlock value={(b.fields ?? b.value) as any} />,
  cta: (b) => <CTABlock value={(b.fields ?? b.value) as any} />,
  newsletter: (b) => <NewsletterFormBlock value={(b.fields ?? b.value) as any} />,
  faq: (b) => <FaqBlock value={(b.fields ?? b.value) as any} />,
  faqItem: (b) => <FaqBlock value={{ question: (b.fields as any)?.question, answer: (b.fields as any)?.answer }} />,
  amenityItem: (b) => <AmenityItemBlock value={(b.fields ?? b.value) as any} />,
  infoCard: (b) => <InfoCardBlock value={(b.fields ?? b.value) as any} />,
  ctaCard: (b) => <CtaCardBlock value={(b.fields ?? b.value) as any} />,
}

export function BlockRenderer({ blocks }: { blocks: PayloadBlock[] | null | undefined }) {
  if (!blocks || !Array.isArray(blocks)) return null
  return (
    <>
      {blocks.map((block, i) => {
        const type = block.blockType ?? block.type
        if (!type) return null
        const Renderer = registry[type]
        if (!Renderer) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`Unknown block type: ${type}`)
          }
          return null
        }
        return <Fragment key={block.id ?? i}>{Renderer(block)}</Fragment>
      })}
    </>
  )
}