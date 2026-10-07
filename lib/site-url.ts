/**
 * Canonical public site URL.
 *
 * Why this module exists: two env vars legitimately hold the same value —
 * `PAYLOAD_PUBLIC_SERVER_URL` (read by payload.config.ts for serverURL,
 * CORS and CSRF) and `NEXT_PUBLIC_SERVER_URL` (read by sitemap/robots/
 * metadata). Next.js only inlines `NEXT_PUBLIC_*` vars into the client and
 * edge bundles, so the duplication cannot be removed — payload.config.ts
 * runs in the Node server process where NEXT_PUBLIC_ vars also work, but
 * the reverse is not true for the browser-facing routes.
 *
 * The real hazard is drift: setting one and forgetting the other silently
 * pointed sitemap.xml, robots.txt and OpenGraph tags at http://localhost:3000
 * while the site itself worked fine. That is an SEO bug with no error
 * message anywhere.
 *
 * `resolveSiteUrl()` therefore prefers PAYLOAD_PUBLIC_SERVER_URL (the one
 * already required by the app), so a correctly configured server gets the
 * right answer even if NEXT_PUBLIC_SERVER_URL was never set. When both are
 * set they must agree — the prod URL is rejected outright rather than
 * silently overriding the caller's value.
 */

const PROD_URL = 'https://dacha.maxdrobin.ru'

function normalise(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

/**
 * Pick the URL to use from the (possibly empty) pair of env vars and
 * normalise it. Shared by both entry points so the two cannot drift.
 */
function pick(raw: string | undefined): string {
  if (!raw) return PROD_URL
  const value = normalise(raw)
  // A localhost default in production means SEO artefacts point at localhost.
  if (value === 'http://localhost:3000') return PROD_URL
  return value
}

/**
 * Resolve the canonical site URL.
 *
 * @throws when the two variables are set to different values — that is a
 *         configuration mistake worth failing loudly over.
 */
export function resolveSiteUrl(): string {
  const payloadUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL
  const nextUrl = process.env.NEXT_PUBLIC_SERVER_URL

  if (payloadUrl && nextUrl && normalise(payloadUrl) !== normalise(nextUrl)) {
    throw new Error(
      `Server URL mismatch: PAYLOAD_PUBLIC_SERVER_URL="${payloadUrl}" but ` +
        `NEXT_PUBLIC_SERVER_URL="${nextUrl}". They must be the same URL — ` +
        `otherwise sitemap.xml, robots.txt and OG tags point at the wrong host.`,
    )
  }

  return pick(payloadUrl || nextUrl)
}

/**
 * Same as {@link resolveSiteUrl} but never throws.
 *
 * For call sites that run during build/prerender (robots.ts is a static
 * route) where throwing would fail the build on a workstation with a
 * partial .env — those still get a usable URL.
 */
export function resolveSiteUrlSafe(): string {
  const payloadUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL
  const nextUrl = process.env.NEXT_PUBLIC_SERVER_URL

  if (payloadUrl && nextUrl && normalise(payloadUrl) !== normalise(nextUrl)) {
    console.warn(
      `[site-url] Ignoring NEXT_PUBLIC_SERVER_URL="${nextUrl}" — differs from ` +
        `PAYLOAD_PUBLIC_SERVER_URL="${payloadUrl}". Set both to the same value.`,
    )
    return pick(payloadUrl)
  }

  return pick(payloadUrl || nextUrl)
}