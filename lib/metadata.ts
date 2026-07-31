import type { Metadata } from 'next'

/**
 * Shared metadata defaults. Used by the root layout and any page-level
 * `metadata` export that needs to inherit `metadataBase` (Next.js 15
 * requires `metadataBase` on every `metadata` export that resolves
 * social/twitter images — even when not explicitly set).
 *
 * Override `NEXT_PUBLIC_SERVER_URL` per environment to point OG/Twitter
 * images at the right host. Falls back to the production domain.
 */
export const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SERVER_URL || 'https://dacha.maxdrobin.ru',
)

export const defaultMetadata: Metadata = {
  metadataBase,
  title: {
    default: 'Дача на удачу — загородный клуб',
    template: '%s — Дача на удачу',
  },
  description: 'Уютное пространство для встреч, мероприятий и отдыха',
}
