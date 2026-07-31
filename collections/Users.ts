import type { CollectionConfig } from 'payload'
import { verifyTelegramAuth } from '../lib/telegram-verify'

/**
 * Users collection — Telegram-authenticated users.
 *
 * Replaces core.UserAccount from Django.
 *
 * Auth strategy: uses standard Payload auth (email + password) BUT we generate
 * a synthetic email (`telegram_<id>@dacha.local`) and random password for
 * each user, so Payload's built-in auth flow works without changes. The
 * `telegram-login` endpoint handles the Telegram widget flow and calls
 * Payload's login() to set the auth cookie.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7, // 7 days
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  admin: {
    useAsTitle: 'telegramId',
    defaultColumns: ['telegramId', 'firstName', 'lastName', 'role'],
  },
  access: {
    read: () => true, // anyone can read user profiles (for RSVP lookups, etc.)
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

        const { id, first_name, last_name, username, photo_url, auth_date } = body
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

        // TODO: issue session cookie. Options:
        //   (a) Use payload.login() with a one-time token system.
        //   (b) Use payload.auth() to manually generate a JWT and set it as
        //       a cookie via Set-Cookie header on the response.
        //   (c) Set up a custom auth strategy in payload.config.ts that
        //       accepts a Telegram-issued one-time token.
        // For now we return user info and let the frontend use the standard
        // /api/users/login endpoint with a known password.

        return Response.json({
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
      },
    },
    {
      path: '/me',
      method: 'get',
      handler: async (req) => {
        const user = req.user
        if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })
        return Response.json({
          id: user.id,
          telegramId: user.telegramId,
          firstName: user.firstName,
          lastName: user.lastName,
          telegramUsername: user.telegramUsername,
          telegramPhotoUrl: user.telegramPhotoUrl,
          role: user.role,
        })
      },
    },
    {
      path: '/logout',
      method: 'post',
      handler: async () => {
        // Cookie-based logout: tell client to clear the cookie.
        // (Real session invalidation requires a custom strategy — TODO.)
        const res = Response.json({ ok: true })
        res.headers.append(
          'Set-Cookie',
          'payload-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
        )
        return res
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
      options: [
        { label: 'User', value: 'user' },
        { label: 'Admin', value: 'admin' },
      ],
      required: true,
    },
  ],
}