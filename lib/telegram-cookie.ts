/**
 * Cookie helpers for the Telegram session.
 *
 * The Telegram auth flow on the frontend uses its own cookie (`telegram-session`)
 * instead of Payload's `payload-token`. That keeps the Telegram session
 * independent from the Payload admin session — logging in via Telegram does
 * not overwrite the admin JWT and vice versa.
 *
 * Cookie attributes must match the existing `auth.cookies` config on the
 * Users collection so browsers accept both side by side.
 */

export const TELEGRAM_SESSION_COOKIE = 'telegram-session'
export const PAYLOAD_TOKEN_COOKIE = 'payload-token'
const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7

/**
 * Build a `Set-Cookie` header value for the Telegram session.
 *
 * - HttpOnly — JS cannot read the cookie, mitigates XSS token theft.
 * - SameSite=Lax — mirrors the Payload default; safe for top-level navigations.
 * - Secure in production — required for SameSite=None, harmless otherwise.
 * - Path=/ — cookie is sent to the entire site, including /api.
 */
export function buildTelegramSessionCookie(token: string): string {
  const isProd = process.env.NODE_ENV === 'production'
  const parts = [
    `${TELEGRAM_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SEVEN_DAYS_SECONDS}`,
  ]
  if (isProd) parts.push('Secure')
  return parts.join('; ')
}

/**
 * Build a `Set-Cookie` header value for Payload's JWT (payload-token).
 *
 * When a user logs in via the Telegram Login Widget, we also issue them a
 * standard Payload JWT so both admin and site auth point to the same User record.
 *
 * Uses the same cookie attributes as the Users collection auth config.
 */
export function buildPayloadTokenCookie(token: string): string {
  const isProd = process.env.NODE_ENV === 'production'
  const parts = [
    `${PAYLOAD_TOKEN_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SEVEN_DAYS_SECONDS}`,
  ]
  if (isProd) parts.push('Secure')
  return parts.join('; ')
}

/** Build a `Set-Cookie` header that clears the Telegram session. */
export function buildClearTelegramSessionCookie(): string {
  const isProd = process.env.NODE_ENV === 'production'
  const parts = [
    `${TELEGRAM_SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ]
  if (isProd) parts.push('Secure')
  return parts.join('; ')
}

/**
 * Read the Telegram session token from a `Cookie` header value.
 * Returns null if the cookie is absent.
 */
export function readTelegramSessionToken(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const name = trimmed.slice(0, eq)
    if (name !== TELEGRAM_SESSION_COOKIE) continue
    const raw = trimmed.slice(eq + 1)
    return decodeURIComponent(raw)
  }
  return null
}
