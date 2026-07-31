import type { MetadataRoute } from 'next'
import { getPayloadClient } from '@/lib/payload'

const SITE_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

/**
 * Dynamic sitemap — fetches all public pages from Payload and emits
 * /sitemap.xml. Honors draft + access control so draft pages are excluded.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayloadClient()
  const baseUrl = SITE_URL.replace(/\/$/, '')

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/houses`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/events`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/news`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/faq`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/booking`, changeFrequency: 'monthly', priority: 0.6 },
  ]

  // Dynamic routes
  const [houses, events, news] = await Promise.all([
    payload.find({
      collection: 'houses',
      limit: 1000,
      depth: 0,
      draft: false,
      overrideAccess: false,
    }),
    payload.find({
      collection: 'events',
      limit: 1000,
      depth: 0,
      draft: false,
      overrideAccess: false,
    }),
    payload.find({
      collection: 'news',
      limit: 1000,
      depth: 0,
      draft: false,
      overrideAccess: false,
    }),
  ])

  const dynamicRoutes: MetadataRoute.Sitemap = [
    ...houses.docs.map((d) => ({
      url: `${baseUrl}/houses/${(d as { slug: string }).slug}`,
      lastModified: (d as { updatedAt: string }).updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...events.docs.map((d) => ({
      url: `${baseUrl}/events/${(d as { slug: string }).slug}`,
      lastModified: (d as { updatedAt: string }).updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...news.docs.map((d) => ({
      url: `${baseUrl}/news/${(d as { slug: string }).slug}`,
      lastModified: (d as { updatedAt: string }).updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]

  return [...staticRoutes, ...dynamicRoutes]
}
