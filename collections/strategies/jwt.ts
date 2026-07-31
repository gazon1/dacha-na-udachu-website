import { JWTAuthentication, type AuthStrategy } from 'payload'

/**
 * JWT cookie strategy — verifies the session token Payload sets after login.
 *
 * Why we need this: `auth.strategies: [telegramStrategy]` REPLACES Payload's
 * default `local-jwt` strategy. After login (via email/password OR telegram),
 * Payload sets a JWT in a cookie. Without this strategy, the next request
 * can't verify the cookie → the admin redirects back to /login.
 *
 * We just re-export Payload's built-in `JWTAuthentication` as a named
 * strategy. Named `local-jwt` to match the internal default that we replaced.
 */
export const jwtStrategy: AuthStrategy = {
  name: 'local-jwt',
  authenticate: JWTAuthentication,
}
