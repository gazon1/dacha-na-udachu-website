/**
 * Content-Security-Policy definitions.
 *
 * Kept in one place because the policy used to be written out twice — once in
 * next.config.mjs (global) and again in middleware.ts (for /admin). The two
 * copies had already drifted: the global one allows https://telegram.org in
 * connect-src for the Telegram login widget, while the /admin copy did not.
 *
 * Note on how the two combine: next.config applies its header to every route,
 * and middleware adds a second CSP header for /admin. Browsers enforce ALL
 * CSP headers as an intersection, so /admin effectively gets the stricter of
 * the two. That behaviour is preserved here — this module is a de-duplication,
 * not a redesign.
 *
 * Plain .mjs (not .ts) because next.config.mjs is loaded natively by Node and
 * cannot import TypeScript.
 */

/** Directives that apply everywhere. Admin overrides a subset of these. */
const BASE_DIRECTIVES = {
  'default-src': ["'self'"],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'frame-ancestors': ["'self'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
}

/** Extra directives for the public site. */
const PUBLIC_DIRECTIVES = {
  ...BASE_DIRECTIVES,
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://telegram.org'],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'connect-src': ["'self'", 'https://telegram.org'],
  'frame-src': ['https://oauth.telegram.org', 'https://telegram.org'],
}

/**
 * /admin overrides. Payload's admin UI runs inline scripts and needs to talk
 * only to its own origin; it does not use the public site's Google Fonts or the
 * Telegram OAuth iframe.
 */
const ADMIN_OVERRIDES = {
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'"],
}

function serialize(directives) {
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ')
}

/** CSP for the public site (set globally via next.config headers()). */
export function publicCsp() {
  return serialize(PUBLIC_DIRECTIVES)
}

/**
 * CSP for /admin (set via middleware). Derived from the same base so a new
 * directive added to the public policy is inherited rather than forgotten.
 */
export function adminCsp() {
  const { 'frame-src': _omitted, ...publicRest } = PUBLIC_DIRECTIVES
  return serialize({ ...publicRest, ...ADMIN_OVERRIDES })
}
