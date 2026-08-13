import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Caddy terminates TLS and provides X-Forwarded-Proto, so trust the proxy.
  // (Required for Payload's cookies to set the right Secure flag and for
  //  CSRF origin checks to work behind HTTPS.)
  trustHost: true,
  experimental: {
    reactCompiler: false,
  },
  // Allow sharp + Payload's bundled deps.
  serverExternalPackages: ['sharp', '@payloadcms/db-postgres', '@payloadcms/richtext-lexical'],
  // Security headers — Payload's CMS admin needs 'unsafe-inline'/'unsafe-eval'
  // for inline scripts. The (payload)/admin routes override these via
  // per-route headers; everything else gets strict.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // CSP for public site. Admin gets relaxed CSP via middleware.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://telegram.org",
              "frame-src https://oauth.telegram.org https://telegram.org",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default withPayload(nextConfig, {
  // Skip bundling 1000+ Payload server modules in dev — speeds up `next dev`.
  devBundleServerPackages: false,
})
