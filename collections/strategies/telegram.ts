import type { AuthStrategy } from 'payload'
import crypto from 'node:crypto'
import { verifyTelegramAuth } from '../../lib/telegram-verify'
import { readTelegramSessionToken } from '../../lib/telegram-cookie'

/**
 * Telegram Login Widget auth strategy.
 *
 * Two ways to authenticate:
 *  1. **Authorization header** `Telegram <base64-payload>` — used by the
 *     standard /api/users/login endpoint for programmatic auth.
 *  2. **`telegram-session` cookie** — set by the /api/users/telegram-login
 *     endpoint and read on every subsequent request. This is the path the
 *     browser uses after a real Telegram login.
 *
 * In both cases we re-verify the Telegram HMAC (never trust the client),
 * look up the user by `telegramId`, and return them. `payload-token` is
 * never set by this strategy — admin and Telegram sessions stay independent.
 */
export const telegramStrategy: AuthStrategy = {
  name: 'telegram',
  authenticate: async ({ payload, headers }) => {
    let token: string | null = null

    const auth = headers.get('authorization')
    if (auth && auth.startsWith('Telegram ')) {
      token = auth.slice('Telegram '.length).trim()
    } else {
      // Browser flow: read from the `telegram-session` cookie.
      token = readTelegramSessionToken(headers.get('cookie'))
    }
    if (!token) return { user: null }

    let parsed: unknown
    try {
      const json = Buffer.from(token, 'base64').toString('utf8')
      parsed = JSON.parse(json)
    } catch {
      return { user: null }
    }

    // Re-verify the Telegram hash — never trust the client.
    const verified = verifyTelegramAuth(
      parsed as Record<string, string>,
      process.env.TELEGRAM_BOT_TOKEN || '',
    )
    if (!verified.ok) return { user: null }

    const telegramId = String((parsed as { id: number }).id)
    const users = await payload.find({
      collection: 'users',
      where: { telegramId: { equals: telegramId } },
      limit: 1,
      depth: 0,
    })
    const user = users.docs[0]
    if (!user) return { user: null }

    return {
      // Narrow to Payload's User shape; the `collection` discriminator is
      // required by Payload to validate the user against the right collection.
      user: { ...user, collection: 'users' } as never,
      responseHeaders: new Headers({
        'X-Auth-Strategy': 'telegram',
      }),
    }
  },
}

// Utility used by the /telegram-login endpoint to encode the payload.
export function encodeTelegramToken(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

// Small helper to generate a per-request idempotency key (useful for
// the /telegram-login endpoint to skip duplicate processing).
export function randomNonce(bytes = 16): string {
  return crypto.randomBytes(bytes).toString('hex')
}
