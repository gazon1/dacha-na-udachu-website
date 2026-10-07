import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { readSeedConfig } from '../scripts/seed'

/**
 * `payload seed` runs as a blocking `depends_on` step on EVERY deploy
 * (docker-compose.yml: seed -> migrate -> backup). Admin credentials are
 * therefore optional: when absent, the content seed must still run and only
 * the admin user is skipped. Making them mandatory meant any .env without
 * them failed every production deploy.
 */
describe('readSeedConfig', () => {
  const saved = { ...process.env }

  beforeEach(() => {
    delete process.env.PAYLOAD_SEED_ADMIN_EMAIL
    delete process.env.PAYLOAD_SEED_ADMIN_PASSWORD
  })

  afterEach(() => {
    for (const key of ['PAYLOAD_SEED_ADMIN_EMAIL', 'PAYLOAD_SEED_ADMIN_PASSWORD'] as const) {
      if (saved[key]) process.env[key] = saved[key]
      else delete process.env[key]
    }
  })

  it('returns an empty config when neither variable is set (deploy-safe)', () => {
    expect(readSeedConfig()).toEqual({})
  })

  it('returns the credentials when both are set', () => {
    process.env.PAYLOAD_SEED_ADMIN_EMAIL = 'admin@example.com'
    process.env.PAYLOAD_SEED_ADMIN_PASSWORD = 'longenough1'
    expect(readSeedConfig()).toEqual({
      adminEmail: 'admin@example.com',
      adminPassword: 'longenough1',
    })
  })

  it('rejects a password shorter than 8 characters', () => {
    process.env.PAYLOAD_SEED_ADMIN_EMAIL = 'admin@example.com'
    process.env.PAYLOAD_SEED_ADMIN_PASSWORD = 'short'
    expect(() => readSeedConfig()).toThrow(/at least 8 characters/i)
  })

  it('rejects a half-configured pair: email only', () => {
    process.env.PAYLOAD_SEED_ADMIN_EMAIL = 'admin@example.com'
    expect(() => readSeedConfig()).toThrow(/PAYLOAD_SEED_ADMIN_PASSWORD/)
  })

  it('rejects a half-configured pair: password only', () => {
    process.env.PAYLOAD_SEED_ADMIN_PASSWORD = 'longenough1'
    expect(() => readSeedConfig()).toThrow(/PAYLOAD_SEED_ADMIN_EMAIL/)
  })

  it('accepts a password of exactly 8 characters', () => {
    process.env.PAYLOAD_SEED_ADMIN_EMAIL = 'admin@example.com'
    process.env.PAYLOAD_SEED_ADMIN_PASSWORD = '12345678'
    expect(() => readSeedConfig()).not.toThrow()
  })
})