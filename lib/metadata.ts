import type { Metadata } from 'next'
import { resolveSiteUrlSafe } from '@/lib/site-url'

/**
 * Shared metadata defaults. Used by the root layout and any page-level
 * `metadata` export that needs to inherit `metadataBase` (Next.js 15
 * requires `metadataBase` on every `metadata` export that resolves
 * social/twitter images — even when not explicitly set).
 *
 * The URL comes from lib/site-url.ts, which resolves
 * PAYLOAD_PUBLIC_SERVER_URL / NEXT_PUBLIC_SERVER_URL and falls back to the
 * production domain. Safe (non-throwing) because metadata.ts is imported by
 * the root layout and evaluated during build.
 */
export const metadataBase = new URL(resolveSiteUrlSafe())

export const defaultMetadata: Metadata = {
  metadataBase,
  title: {
    default: 'Дача на удачу — загородный клуб',
    template: '%s — Дача на удачу',
  },
  description: 'Уютное пространство для встреч, мероприятий и отдыха',
}
