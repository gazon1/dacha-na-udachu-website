import type { CollectionConfig } from 'payload'
import crypto from 'node:crypto'
import { verifyTelegramAuth } from '../lib/telegram-verify'
import { isAdmin, isAdminOrSelf } from '../lib/access'
import { telegramStrategy, encodeTelegramToken } from './strategies/telegram'
import { jwtStrategy } from './strategies/jwt'
import { buildTelegramSessionCookie } from '../lib/telegram-cookie'

/**
 * Users collection — Telegram-authenticated users.
 *
 * Replaces core.UserAccount from Django.
 *
 * Auth flow (Telegram, frontend):
 *  1. Client posts the verified Telegram payload to /api/users/telegram-login.
 *  2. Endpoint re-verifies the HMAC, finds/creates a User, sets the
 *     `telegram-session` cookie and returns the user info.
 *  3. On every subsequent request, telegramStrategy reads `telegram-session`,
 *     re-verifies the HMAC, and returns the user.
 *  4. The admin cookie `payload-token` is NEVER touched here — admin and
 *     Telegram sessions stay independent.
 *
 * Auth flow (admin):
 *  - /admin uses Payload's standard email/password login which sets
 *    `payload-token` (handled by jwtStrategy).
 */
export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7, // 7 days
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
    maxLoginAttempts: 7,
    lockTime: 10 * 60 * 1000, // 10 min
    // Custom auth strategy — reads Telegram auth header.
    // JWT strategy is listed first so cookie-based session verification
    // (the default after login) keeps working alongside Telegram.
    strategies: [jwtStrategy, telegramStrategy],
  },
  admin: {
    useAsTitle: 'telegramId',
    defaultColumns: ['telegramId', 'firstName', 'lastName', 'role'],
    enableListViewSelectAPI: true,
    pagination: { defaultLimit: 25, limits: [10, 25, 50, 100] },
    listSearchableFields: ['telegramId', 'firstName', 'lastName', 'telegramUsername'],
    description: 'Telegram-authenticated users.',
    group: 'Система',
  },
  // When other collections populate a User, only fetch these fields by default.
  // Saves payload on every read.
  defaultPopulate: {
    telegramId: true,
    firstName: true,
    lastName: true,
    telegramPhotoUrl: true,
    role: true,
  },
  // Public read (RSVP lookups etc). Admin OR self can update.
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  endpoints: [
    {
      path: '/telegram-login',
      method: 'post',
      handler: async (req) => {
        const body = (await req.json?.()) ?? (req as any).body
        const result = verifyTelegramAuth(
          body,
          process.env.TELEGRAM_BOT_TOKEN || ''
        )
        if (!result.ok) {
          return Response.json({ error: result.reason }, { status: 401 })
        }

        const { id, first_name, last_name, username, photo_url, auth_date } =
          body
        const telegramId = String(id)

        // Find or create user
        const existing = await req.payload.find({
          collection: 'users',
          where: { telegramId: { equals: telegramId } },
          limit: 1,
        })

        let user = existing.docs[0]
        if (!user) {
          // Synthetic email + random password — Payload's standard auth flow
          // works without revealing anything to the Telegram user.
          const syntheticEmail = `telegram_${telegramId}@dacha.local`
          const randomPassword = crypto.randomUUID()

          user = await req.payload.create({
            collection: 'users',
            data: {
              email: syntheticEmail,
              password: randomPassword,
              telegramId,
              firstName: first_name,
              lastName: last_name,
              telegramUsername: username,
              telegramPhotoUrl: photo_url,
              role: 'user',
            },
          })
        }

        // Encode the verified payload as a base64 token. It goes both into
        // the response body (for legacy callers) and into the standalone
        // `telegram-session` cookie, which telegramStrategy reads on
        // subsequent requests. The standard `payload-token` cookie is NOT
        // touched here — admin and Telegram sessions stay independent.
        const token = encodeTelegramToken(body)

        const res = Response.json({
          token,
          user: {
            id: user.id,
            telegramId: user.telegramId,
            firstName: user.firstName,
            lastName: user.lastName,
            telegramUsername: user.telegramUsername,
            telegramPhotoUrl: user.telegramPhotoUrl,
            role: user.role,
          },
        })
        res.headers.append('Set-Cookie', buildTelegramSessionCookie(token))
        return res
      },
    },
    {
      // /me — returns the currently authenticated user (set by Payload).
      path: '/me',
      method: 'get',
      handler: async (req) => {
        const user = req.user
        if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })
        return Response.json({
          id: user.id,
          telegramId: (user as { telegramId?: string }).telegramId,
          firstName: (user as { firstName?: string }).firstName,
          lastName: (user as { lastName?: string }).lastName,
          telegramUsername: (user as { telegramUsername?: string })
            .telegramUsername,
          telegramPhotoUrl: (user as { telegramPhotoUrl?: string })
            .telegramPhotoUrl,
          role: (user as { role?: string }).role,
        })
      },
    },
  ],
  fields: [
    {
      name: 'telegramId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      maxLength: 50,
    },
    { name: 'firstName', type: 'text', maxLength: 200 },
    { name: 'lastName', type: 'text', maxLength: 200 },
    { name: 'telegramUsername', type: 'text', maxLength: 64 },
    { name: 'telegramPhotoUrl', type: 'text', maxLength: 500 },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'user',
      index: true,
      options: [
        { label: 'User', value: 'user' },
        { label: 'Admin', value: 'admin' },
      ],
      required: true,
      // Save role into the JWT so access-control functions don't need to
      // hit the DB on every request.
      saveToJWT: true,
    },
  ],
}