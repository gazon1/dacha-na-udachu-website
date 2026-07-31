import crypto from 'crypto'

/**
 * Verify Telegram Login Widget auth data.
 *
 * Ported from /workspace/backend/core/telegram_auth.py:18-50.
 * Algorithm:
 *   1. Build data_check_string by sorting all non-empty fields alphabetically.
 *   2. secret_key = SHA256(bot_token).
 *   3. HMAC-SHA256(secret_key, data_check_string).
 *   4. Constant-time compare to `hash` from Telegram.
 *   5. Check `auth_date` freshness (default 300s, allow 60s clock drift).
 *
 * @see https://core.telegram.org/widgets/login#checking-authorization
 */
const DEFAULT_MAX_AGE_SECONDS = 300
const CLOCK_SKEW_SECONDS = 60

export type TelegramAuthPayload = {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export type VerifyResult =
  | { ok: true; payload: TelegramAuthPayload }
  | { ok: false; reason: string }

export function verifyTelegramAuth(
  data: any,
  botToken: string,
  maxAgeSeconds: number = DEFAULT_MAX_AGE_SECONDS
): VerifyResult {
  if (!data || typeof data !== 'object') {
    return { ok: false, reason: 'invalid_payload' }
  }
  if (!data.id || !data.auth_date || !data.hash) {
    return { ok: false, reason: 'missing_required_fields' }
  }
  if (!botToken) {
    return { ok: false, reason: 'server_misconfigured' }
  }

  // 1. Check auth_date freshness
  const authDate = Number(data.auth_date)
  const nowSec = Math.floor(Date.now() / 1000)
  const age = nowSec - authDate
  if (Math.abs(age) > maxAgeSeconds + CLOCK_SKEW_SECONDS) {
    return { ok: false, reason: 'auth_date_expired' }
  }

  // 2. Build data_check_string from sorted non-empty fields except `hash`
  const fields = Object.entries(data)
    .filter(([key, value]) => key !== 'hash' && value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
  const dataCheckString = fields.join('\n')

  // 3. secret_key = SHA256(bot_token)
  const secretKey = crypto.createHash('sha256').update(botToken).digest()

  // 4. HMAC-SHA256
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  // 5. Constant-time compare
  const expected = data.hash
  if (!timingSafeEqualHex(hmac, expected)) {
    return { ok: false, reason: 'invalid_hash' }
  }

  return {
    ok: true,
    payload: {
      id: Number(data.id),
      first_name: data.first_name,
      last_name: data.last_name,
      username: data.username,
      photo_url: data.photo_url,
      auth_date: authDate,
      hash: data.hash,
    },
  }
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch {
    return false
  }
}