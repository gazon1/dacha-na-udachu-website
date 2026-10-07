import { describe, expect, it } from 'vitest'

import { verifyWebhookSignature } from '@/lib/yoomoney'

/**
 * YooMoney signs notifications by concatenating the POST fields (excluding
 * `sign`) sorted by key, joining as `k=encodeURIComponent(v)` with `&`, and
 * taking HMAC-SHA256 with the notification secret.
 *
 * These tests reimplement the signing side independently of the function under
 * test, so a bug in verifyWebhookSignature cannot "agree with itself".
 */

const SECRET = 'test-notification-secret'

async function sign(
  body: Record<string, string>,
  secret = SECRET,
): Promise<string> {
  const stringToSign = Object.entries(body)
    .filter(([k]) => k !== 'sign')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(stringToSign))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

describe('verifyWebhookSignature', () => {
  it('accepts a correctly signed notification', async () => {
    const body = {
      notification_type: 'p2p-incoming',
      operation_id: '1234567',
      amount: '500.00',
      currency: '643',
      sender: '4100112345678',
      datetime: '2026-08-13T14:32:11Z',
      label: 'contrib-secret-key',
    }
    const signature = await sign(body)
    expect(await verifyWebhookSignature({ ...body, sign: signature }, SECRET)).toBe(true)
  })

  it('rejects a tampered amount', async () => {
    const body = {
      notification_type: 'p2p-incoming',
      operation_id: '1234567',
      amount: '500.00',
      currency: '643',
    }
    const signature = await sign(body)
    // Attacker raises the amount after the payload was signed.
    const tampered = { ...body, amount: '5000.00', sign: signature }
    expect(await verifyWebhookSignature(tampered, SECRET)).toBe(false)
  })

  it('rejects a valid signature computed with a different secret', async () => {
    const body = { operation_id: '1234567', amount: '500.00' }
    const signature = await sign(body, 'attacker-secret')
    expect(await verifyWebhookSignature({ ...body, sign: signature }, SECRET)).toBe(false)
  })

  it('rejects a missing signature', async () => {
    expect(await verifyWebhookSignature({ amount: '500.00' }, SECRET)).toBe(false)
  })

  it('rejects an empty signature', async () => {
    expect(await verifyWebhookSignature({ amount: '500.00', sign: '' }, SECRET)).toBe(false)
  })

  it('rejects a signature of the wrong length', async () => {
    const body = { operation_id: '1234567', amount: '500.00' }
    const signature = await sign(body)
    expect(await verifyWebhookSignature({ ...body, sign: signature.slice(0, 10) }, SECRET)).toBe(
      false,
    )
  })

  it('is insensitive to key ordering on the wire', async () => {
    const ordered = { a: '1', b: '2', c: '3' }
    const signature = await sign(ordered)
    const shuffled = { c: '3', a: '1', b: '2' }
    expect(await verifyWebhookSignature({ ...shuffled, sign: signature }, SECRET)).toBe(true)
  })

  it('rejects a single-character change that preserves length', async () => {
    const body = { operation_id: '1234567', amount: '500.00' }
    const signature = await sign(body)
    const flipped = signature[0] === 'a' ? `b${signature.slice(1)}` : `a${signature.slice(1)}`
    expect(await verifyWebhookSignature({ ...body, sign: flipped }, SECRET)).toBe(false)
  })
})