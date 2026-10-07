import { describe, expect, it } from 'vitest'

import { CancelSchema, SecretSchema } from '../collections/endpoints/events-rsvp'

/**
 * The secretKey endpoints take that key as their ONLY credential, and it now
 * travels in the JSON body rather than the URL. These tests import the REAL
 * schemas — a duplicated copy here would agree with a broken implementation and
 * catch nothing.
 */
describe('secretKey request schema', () => {
  it('accepts a UUID-shaped key', () => {
    expect(SecretSchema.safeParse({ secretKey: crypto.randomUUID() }).success).toBe(true)
  })

  it('rejects a missing key', () => {
    expect(SecretSchema.safeParse({}).success).toBe(false)
  })

  it('rejects an empty key', () => {
    expect(SecretSchema.safeParse({ secretKey: '' }).success).toBe(false)
  })

  it('rejects an over-long key', () => {
    expect(SecretSchema.safeParse({ secretKey: 'x'.repeat(65) }).success).toBe(false)
  })

  it('rejects a non-string key', () => {
    expect(SecretSchema.safeParse({ secretKey: 123 }).success).toBe(false)
  })
})

describe('cancel request schema', () => {
  const key = 'a'.repeat(36)

  it('defaults status to not_going', () => {
    const parsed = CancelSchema.safeParse({ secretKey: key })
    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data.status).toBe('not_going')
  })

  it('accepts the full update payload', () => {
    const parsed = CancelSchema.safeParse({
      secretKey: key,
      status: 'going',
      name: 'Иван',
      guestsCount: 3,
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.name).toBe('Иван')
      expect(parsed.data.guestsCount).toBe(3)
    }
  })

  it('still requires the secretKey', () => {
    expect(CancelSchema.safeParse({ status: 'going' }).success).toBe(false)
  })

  it('rejects an out-of-range guestsCount', () => {
    expect(CancelSchema.safeParse({ secretKey: key, guestsCount: 51 }).success).toBe(false)
    expect(CancelSchema.safeParse({ secretKey: key, guestsCount: 0 }).success).toBe(false)
  })

  it('rejects an unknown status', () => {
    expect(CancelSchema.safeParse({ secretKey: key, status: 'hacked' }).success).toBe(false)
  })
})
