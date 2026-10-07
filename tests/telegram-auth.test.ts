import { createHash, createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { verifyTelegramAuth } from '@/lib/telegram-verify'

/**
 * Telegram signs login payloads by sorting the non-empty fields (excluding
 * `hash`) and HMAC-ing them. The sort must be plain byte order — the previous
 * implementation used `localeCompare`, whose result depends on the runtime
 * locale, so a payload could verify on one machine and fail on another.
 *
 * Each case below is signed with an INDEPENDENT implementation of the spec
 * rather than by calling the function under test, so the two cannot agree on a
 * shared mistake.
 */
const BOT_TOKEN = '123456:AAtest-bot-token-value-here'
const KEY_BYTES = Buffer.from(BOT_TOKEN, 'utf8')
const hash = createHash('sha256').update(KEY_BYTES).digest()

/** Reference signer: sorts keys with byte comparison, per Telegram's spec. */
function sign(payload: Record<string, string | number>): string {
  const entries = Object.entries(payload)
    .filter(([k, v]) => k !== 'hash' && v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => (Buffer.compare(Buffer.from(a), Buffer.from(b))))
    .map(([k, v]) => `${k}=${v}`)
  return createHmac('sha256', hash).update(entries.join('\n')).digest('hex')
}

function payload(extra: Record<string, string | number> = {}) {
  return {
    id: 424242,
    first_name: 'Мария',
    username: 'maria',
    auth_date: Math.floor(Date.now() / 1000),
    ...extra,
  }
}

describe('verifyTelegramAuth', () => {
  it('accepts a correctly signed payload', () => {
    const base = payload()
    const result = verifyTelegramAuth({ ...base, hash: sign(base) }, BOT_TOKEN)
    expect(result.ok).toBe(true)
  })

  it('rejects a tampered telegram id', () => {
    const base = payload()
    const signature = sign(base)
    const result = verifyTelegramAuth({ ...base, id: 999999, hash: signature }, BOT_TOKEN)
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toBe('invalid_hash')
  })

  it('rejects a signature made with a different bot token', () => {
    const base = payload()
    const signature = sign(base)
    const result = verifyTelegramAuth({ ...base, hash: signature }, '999999:other-token')
    expect(result.ok).toBe(false)
  })

  it('rejects a stale auth_date', () => {
    const old = Math.floor(Date.now() / 1000) - 3600
    const base = payload({ auth_date: old })
    const result = verifyTelegramAuth({ ...base, hash: sign(base) }, BOT_TOKEN)
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toBe('auth_date_expired')
  })

  it('rejects a missing hash', () => {
    expect(verifyTelegramAuth({ id: 1, auth_date: Math.floor(Date.now() / 1000) }, BOT_TOKEN).ok).toBe(
      false,
    )
  })

  it('verifies regardless of the key order on the wire', () => {
    const base = payload()
    const signature = sign(base)
    const shuffled = {
      auth_date: base.auth_date,
      id: base.id,
      username: base.username,
      first_name: base.first_name,
      hash: signature,
    }
    expect(verifyTelegramAuth(shuffled, BOT_TOKEN).ok).toBe(true)
  })

  it('sorts keys by byte order, not locale collation', () => {
    // Keys where localeCompare and byte order diverge: '_' (0x5F) vs 'Z' (0x5A).
    // Under a collation that ignores punctuation, 'a_z' may sort before 'aZ';
    // byte order puts 'aZ' first. The reference signer uses Buffer.compare, so
    // this only passes if the implementation does the same.
    const base = {
      id: 7,
      auth_date: Math.floor(Date.now() / 1000),
      aZ: 'upper',
      a_z: 'lower',
    }
    const signature = sign(base)
    const result = verifyTelegramAuth({ ...base, hash: signature }, BOT_TOKEN)
    expect(result.ok).toBe(true)
  })
})