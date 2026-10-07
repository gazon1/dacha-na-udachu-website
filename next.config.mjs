import { withPayload } from '@payloadcms/next/withPayload'

import { publicCsp } from './lib/csp.mjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Caddy terminates TLS and provides X-Forwarded-Proto, so trust the proxy.
  // (Required for Payload's cookies to set the right Secure flag and for
  //  CSRF origin checks to work behind HTTPS.)
  // Note: trustHost is set via TRUST_HOST=1 env var, not via config.
  experimental: {
    reactCompiler: false,
  },
  // Allow sharp + Payload's bundled deps.
  serverExternalPackages: ['sharp', '@payloadcms/db-postgres', '@payloadcms/richtext-lexical'],
  // Security headers. The CSP itself lives in lib/csp.mjs so that the /admin
  // variant in middleware.ts is derived from the same base instead of being a
  // second hand-maintained copy.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // CSP for the whole site. /admin additionally gets the admin variant
          // from middleware.ts; browsers enforce both as an intersection.
          { key: 'Content-Security-Policy', value: publicCsp() },
        ],
      },
    ]
  },
}

export default withPayload(nextConfig, {
  // Skip bundling 1000+ Payload server modules in dev — speeds up `next dev`.
  devBundleServerPackages: false,
})
