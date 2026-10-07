import { describe, expect, it } from 'vitest'

import { adminCsp, publicCsp } from '@/lib/csp.mjs'

/**
 * The CSP used to be hand-written twice — in next.config.mjs and in
 * middleware.ts — and the two copies had already drifted. These tests pin the
 * contract so a future edit has to be deliberate.
 *
 * Both headers apply to /admin (next.config matches '/(.*)' and middleware adds
 * a second one); browsers enforce all CSP headers as an intersection. So
 * /admin is effectively limited by whichever policy is stricter.
 */

function parse(policy: string): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const part of policy.split(';').map((p) => p.trim()).filter(Boolean)) {
    const [name, ...values] = part.split(/\s+/)
    out[name] = values
  }
  return out
}

describe('publicCsp', () => {
  const csp = parse(publicCsp())

  it('locks down the baseline directives', () => {
    expect(csp['default-src']).toEqual(["'self'"])
    expect(csp['frame-ancestors']).toEqual(["'self'"])
    expect(csp['base-uri']).toEqual(["'self'"])
    expect(csp['form-action']).toEqual(["'self'"])
  })

  it('allows the Telegram login widget origins', () => {
    // The Telegram OAuth widget is why these exist — dropping them breaks login.
    expect(csp['connect-src']).toContain('https://telegram.org')
    expect(csp['frame-src']).toContain('https://oauth.telegram.org')
  })

  it('keeps images permissive enough for user uploads', () => {
    expect(csp['img-src']).toEqual(["'self'", 'data:', 'blob:', 'https:'])
  })

  it('does not allow framing by third parties', () => {
    expect(csp['frame-ancestors']).not.toContain("'unsafe-inline'")
  })
})

describe('adminCsp', () => {
  const csp = parse(adminCsp())

  it('keeps inline scripts for the Payload admin UI', () => {
    expect(csp['script-src']).toContain("'unsafe-inline'")
    expect(csp['script-src']).toContain("'unsafe-eval'")
  })

  it('does not need the public site external origins', () => {
    expect(csp['connect-src']).toEqual(["'self'"])
    expect(csp['frame-src']).toBeUndefined()
  })

  it('still inherits the base directives rather than dropping them', () => {
    expect(csp['default-src']).toEqual(["'self'"])
    expect(csp['frame-ancestors']).toEqual(["'self'"])
    expect(csp['base-uri']).toEqual(["'self'"])
    expect(csp['form-action']).toEqual(["'self'"])
    expect(csp['img-src']).toEqual(["'self'", 'data:', 'blob:', 'https:'])
  })

  it('emits every directive exactly once', () => {
    const names = adminCsp().split(';').map((p) => p.trim().split(/\s+/)[0])
    expect(new Set(names).size).toBe(names.length)
  })
})
