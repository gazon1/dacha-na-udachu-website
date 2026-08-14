import type { CollectionConfig } from 'payload'
import crypto from 'node:crypto'
import { SignJWT } from 'jose'
import { verifyTelegramAuth } from '../lib/telegram-verify'
import { isAdmin, isAdminOrSelf } from '../lib/access'
import { telegramStrategy, encodeTelegramToken } from './strategies/telegram'
import { jwtStrategy } from './strategies/jwt'
import { buildTelegramSessionCookie, buildPayloadTokenCookie } from '../lib/telegram-cookie'

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

        const { id, first_name, last_name, username, photo_url } = body
        const telegramId = String(id)

        // 1. Look for an existing User by telegramId.
        const byTg = await req.payload.find({
          collection: 'users',
          where: { telegramId: { equals: telegramId } },
          limit: 1,
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let user: Record<string, any> | undefined = byTg.docs[0]

        // 2. If no Telegram link exists, check whether the current request already
        //    has a logged-in user (valid payload-token from admin login).  If so,
        //    link this Telegram account to the existing admin account instead of
        //    creating a second User — admin and Telegram logins become complementary.
        if (!user && req.user) {
          await req.payload.update({
            collection: 'users',
            id: req.user.id,
            data: {
              telegramId,
              firstName: first_name ?? undefined,
              lastName: last_name ?? undefined,
              telegramUsername: username ?? undefined,
              telegramPhotoUrl: photo_url ?? undefined,
            },
          })
          user = await req.payload.findByID({
            collection: 'users',
            id: req.user.id,
            depth: 0,
          })
        }

        // 3. Still no match — create a new synthetic User.
        if (!user) {
          user = await req.payload.create({
            collection: 'users',
            data: {
              email: `telegram_${telegramId}@dacha.local`,
              password: crypto.randomUUID(),
              telegramId,
              firstName: first_name ?? undefined,
              lastName: last_name ?? undefined,
              telegramUsername: username ?? undefined,
              telegramPhotoUrl: photo_url ?? undefined,
              role: 'user',
            },
          })
        }

        // Encode Telegram token for telegram-session cookie (read by telegramStrategy).
        const tgToken = encodeTelegramToken(body)

        // Build the response first so we can add Set-Cookie headers.
        const res = Response.json({
          token: tgToken,
          user: {
            id: user.id,
            telegramId: user.telegramId ?? null,
            firstName: user.firstName ?? null,
            lastName: user.lastName ?? null,
            telegramUsername: user.telegramUsername ?? null,
            telegramPhotoUrl: user.telegramPhotoUrl ?? null,
            role: user.role ?? null,
          },
        })

        // Always set telegram-session cookie.
        res.headers.append('Set-Cookie', buildTelegramSessionCookie(tgToken))

        // Also mint a standard Payload JWT so admin auth and Telegram auth point
        // to the same User record when both login paths are used by the same person.
        const secret = process.env.PAYLOAD_SECRET
        if (secret) {
          const secretKey = new TextEncoder().encode(secret)
          const expiration = 60 * 60 * 24 * 7 // 7 days — mirrors Users.auth.tokenExpiration
          const iat = Math.floor(Date.now() / 1000)
          const jwt = await new SignJWT({
            id: user.id,
            collection: 'users',
            email: user.email ?? '',
          })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt(iat)
            .setExpirationTime(iat + expiration)
            .sign(secretKey)
          res.headers.append('Set-Cookie', buildPayloadTokenCookie(jwt))
        }

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