import type { MetadataRoute } from 'next'
import { resolveSiteUrlSafe } from '@/lib/site-url'

// Centralised — see lib/site-url.ts. Safe variant because robots.ts is a
// static route that also runs during build.
const SITE_URL = resolveSiteUrlSafe()

/**
 * /robots.txt — disallow admin/api, allow everything else.
 * Sitemap is referenced from the host URL.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: `${SITE_URL.replace(/\/$/, '')}/sitemap.xml`,
    host: SITE_URL,
  }
}
