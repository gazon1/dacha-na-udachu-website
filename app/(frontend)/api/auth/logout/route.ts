import { NextResponse } from 'next/server'
import { buildClearTelegramSessionCookie } from '@/lib/telegram-cookie'

/**
 * POST /api/auth/logout
 *
 * Clears both the admin JWT cookie and the Telegram session cookie so the
 * two stay independent — logging out of the site must not log the user out
 * of /admin, and vice versa.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true })

  // Clear the Payload JWT cookie (admin session).
  // The cookie name is 'payload-token' by default for JWT strategy.
  response.cookies.set('payload-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })

  // Clear the Telegram session cookie (frontend session).
  response.headers.append('Set-Cookie', buildClearTelegramSessionCookie())

  return response
}
