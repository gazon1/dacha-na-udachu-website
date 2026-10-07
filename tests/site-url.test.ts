import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { resolveSiteUrl, resolveSiteUrlSafe } from '@/lib/site-url'

const PROD = 'https://dacha.maxdrobin.ru'

/**
 * These tests guard the exact bug that motivated lib/site-url.ts: sitemap,
 * robots and OG metadata read NEXT_PUBLIC_SERVER_URL while Payload reads
 * PAYLOAD_PUBLIC_SERVER_URL. Setting only one silently pointed SEO artefacts
 * at http://localhost:3000 while the site itself worked.
 */
describe('lib/site-url', () => {
  const saved = { ...process.env }

  beforeEach(() => {
    delete process.env.PAYLOAD_PUBLIC_SERVER_URL
    delete process.env.NEXT_PUBLIC_SERVER_URL
  })

  afterEach(() => {
    process.env.PAYLOAD_PUBLIC_SERVER_URL = saved.PAYLOAD_PUBLIC_SERVER_URL
    process.env.NEXT_PUBLIC_SERVER_URL = saved.NEXT_PUBLIC_SERVER_URL
    if (!saved.PAYLOAD_PUBLIC_SERVER_URL) delete process.env.PAYLOAD_PUBLIC_SERVER_URL
    if (!saved.NEXT_PUBLIC_SERVER_URL) delete process.env.NEXT_PUBLIC_SERVER_URL
  })

  it('falls back to the production domain when nothing is configured', () => {
    expect(resolveSiteUrlSafe()).toBe(PROD)
  })

  it('never returns localhost, which would poison sitemap/robots', () => {
    process.env.PAYLOAD_PUBLIC_SERVER_URL = 'http://localhost:3000'
    expect(resolveSiteUrlSafe()).toBe(PROD)
  })

  it('works when only PAYLOAD_PUBLIC_SERVER_URL is set', () => {
    process.env.PAYLOAD_PUBLIC_SERVER_URL = PROD
    expect(resolveSiteUrlSafe()).toBe(PROD)
  })

  it('works when only NEXT_PUBLIC_SERVER_URL is set', () => {
    process.env.NEXT_PUBLIC_SERVER_URL = PROD
    expect(resolveSiteUrlSafe()).toBe(PROD)
  })

  it('normalises a trailing slash so URLs concatenate cleanly', () => {
    process.env.PAYLOAD_PUBLIC_SERVER_URL = `${PROD}/`
    expect(resolveSiteUrlSafe()).toBe(PROD)
  })

  it('tolerates a trailing slash on only one side of the pair', () => {
    process.env.PAYLOAD_PUBLIC_SERVER_URL = PROD
    process.env.NEXT_PUBLIC_SERVER_URL = `${PROD}/`
    expect(resolveSiteUrlSafe()).toBe(PROD)
  })

  it('strict variant throws when the two variables disagree', () => {
    process.env.PAYLOAD_PUBLIC_SERVER_URL = 'https://a.example'
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://b.example'
    expect(() => resolveSiteUrl()).toThrow(/mismatch/i)
  })

  it('safe variant prefers PAYLOAD_PUBLIC_SERVER_URL on disagreement', () => {
    process.env.PAYLOAD_PUBLIC_SERVER_URL = 'https://a.example'
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://b.example'
    expect(resolveSiteUrlSafe()).toBe('https://a.example')
  })

  it('honours a non-production host when both agree', () => {
    process.env.PAYLOAD_PUBLIC_SERVER_URL = 'https://staging.example'
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://staging.example'
    expect(resolveSiteUrlSafe()).toBe('https://staging.example')
  })
})