import crypto from 'node:crypto'
import type { BotContext } from '../session'
import { getBotPayload } from '../db'

/**
 * Ensures a Payload User exists for the current Telegram user.
 *
 * Priority:
 *  1. Already linked  → return cached userId from session
 *  2. Found in DB     → update session, return id
 *  3. Not found       → create User, update session, return id
 *
 * This is called from the RSVP handler so that anonymous Telegram users can
 * vote without first visiting the site. If the user later logs in via the
 * Telegram Login Widget on the website, /api/users/telegram-login will find
 * this same User by telegramId and enrich it with photo_url / last_name.
 */
export async function ensureUser(ctx: BotContext): Promise<number> {
  if (ctx.session.userId !== null) {
    return ctx.session.userId as number
  }

  const telegramId = ctx.session.telegramId
  if (!telegramId) {
    throw new Error('telegramId is missing from session')
  }

  const payload = await getBotPayload()

  // 1. Try to find by telegramId (handles case where session was reset but
  //    the user already exists — e.g. after bot restart).
  try {
    const existing = await payload.find({
      collection: 'users',
      where: { telegramId: { equals: telegramId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (existing.docs[0]) {
      const user = existing.docs[0] as { id: number | string; role?: string }
      ctx.session.userId = Number(user.id)
      ctx.session.role = (user.role as 'admin' | 'user') ?? 'user'
      return ctx.session.userId
    }
  } catch (err) {
    console.error('[ensureUser] lookup failed:', err)
    throw err
  }

  // 2. Not found — create a synthetic User.
  //    The same pattern as /api/users/telegram-login in the main app:
  //    random email + random password; real telegram fields are stored in the
  //    dedicated columns so the widget can enrich this record later.
  const name =
    ctx.session.firstName ??
    ctx.from?.first_name ??
    (ctx.from?.username ? `@${ctx.from.username}` : 'Telegram')

  const created = await payload.create({
    collection: 'users',
    data: {
      email: `telegram_${telegramId}@dacha.local`,
      password: crypto.randomUUID(),
      telegramId,
      firstName: name,
      lastName: ctx.from?.last_name ?? null,
      telegramUsername: ctx.from?.username ?? null,
      role: 'user',
    },
    overrideAccess: true,
  })

  ctx.session.userId = Number(created.id)
  ctx.session.role = 'user'
  return ctx.session.userId
}
