import { NextResponse } from 'next/server'

/**
 * POST /api/auth/logout
 *
 * Clears the Payload JWT cookie and returns success.
 * Client should delete any local state and reload.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true })

  // Clear the Payload JWT cookie.
  // The cookie name is 'payload-token' by default for JWT strategy.
  response.cookies.set('payload-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })

  return response
}
