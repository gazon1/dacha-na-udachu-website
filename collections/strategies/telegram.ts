import type { AuthStrategy } from 'payload'
import crypto from 'node:crypto'
import { verifyTelegramAuth } from '../../lib/telegram-verify'

/**
 * Telegram Login Widget auth strategy.
 *
 * Flow:
 *  1. Client posts the verified Telegram payload to
 *     /api/users/telegram-login.
 *  2. That endpoint re-verifies the payload, finds or creates a User,
 *     and returns a base64-encoded JSON `token` (the original payload).
 *  3. Client posts `{ strategy: 'telegram', token }` to the standard
 *     /api/users/login endpoint.
 *  4. Payload calls THIS strategy's `authenticate` with the `Authorization`
 *     header set to `Telegram <token>`.
 *  5. We re-verify the hash, find the user by telegramId, and return them.
 *
 * Why a separate strategy? Standard email/password login doesn't work for
 * users who don't have an email — Telegram users have a synthetic
 * `telegram_<id>@dacha.local` email. The strategy lets us avoid
 * storing / comparing any password.
 */
export const telegramStrategy: AuthStrategy = {
  name: 'telegram',
  authenticate: async ({ payload, headers }) => {
    const auth = headers.get('authorization')
    if (!auth || !auth.startsWith('Telegram ')) return { user: null }
    const token = auth.slice('Telegram '.length).trim()
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
