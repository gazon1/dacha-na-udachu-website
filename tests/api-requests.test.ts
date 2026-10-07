import { describe, expect, it } from 'vitest'

import {
  buildContributionBySecretBody,
  buildRsvpSubmitBody,
  buildRsvpUpdateBody,
  SECRET_ENDPOINTS,
} from '@/lib/api-requests'

/**
 * The widgets send the secretKey as their only credential. If it ends up in a
 * path again, nothing fails loudly: TypeScript is happy, and the user just sees
 * "my contribution vanished". These tests pin the body shape and, more
 * importantly, assert that no endpoint carries a secret in its URL.
 */
const KEY = '3f2504e0-4f89-11d3-9a0c-0305e82c3301'

describe('secretKey never travels in a URL', () => {
  it('no endpoint constant contains a key-shaped segment', () => {
    for (const [name, url] of Object.entries(SECRET_ENDPOINTS)) {
      expect(url, `${name} must not embed a secret`).not.toMatch(/\/by-secret\/.+/)
      expect(url, `${name} must not embed a secret`).not.toMatch(/\/cancel\/.+/)
    }
  })

  it('no endpoint contains the literal key value', () => {
    for (const url of Object.values(SECRET_ENDPOINTS)) {
      expect(url).not.toContain(KEY)
    }
  })

  it('endpoints are static paths that can be reviewed at a glance', () => {
    expect(SECRET_ENDPOINTS).toEqual({
      contributionBySecret: '/api/event-contributions/by-secret',
      rsvpBySecret: '/api/event-rsvps/by-secret',
      rsvpSubmit: '/api/event-rsvps/submit',
      rsvpCancel: '/api/event-rsvps/cancel',
    })
  })
})

describe('buildContributionBySecretBody', () => {
  it('sends exactly the secretKey field', () => {
    expect(buildContributionBySecretBody(KEY)).toEqual({ secretKey: KEY })
  })

  it('round-trips through JSON unchanged', () => {
    const body = JSON.parse(JSON.stringify(buildContributionBySecretBody(KEY)))
    expect(body.secretKey).toBe(KEY)
  })
})

describe('buildRsvpSubmitBody', () => {
  it('sends the event slug under the key the schema expects', () => {
    const body = buildRsvpSubmitBody({
      eventSlug: 'den-rozhdeniya',
      name: 'Мария',
      guestsCount: 2,
      status: 'going',
    })
    // The endpoint's Zod schema expects `event`, not `eventSlug`.
    expect(body).toEqual({
      event: 'den-rozhdeniya',
      name: 'Мария',
      guestsCount: 2,
      status: 'going',
    })
    expect(body).not.toHaveProperty('secretKey')
  })
})

describe('buildRsvpUpdateBody', () => {
  const update = { status: 'going', guestsCount: 3, name: 'Мария' }

  it('carries the secretKey in the body', () => {
    const body = buildRsvpUpdateBody(KEY, update)
    expect(body.secretKey).toBe(KEY)
    expect(body.status).toBe('going')
    expect(body.guestsCount).toBe(3)
    expect(body.name).toBe('Мария')
  })

  it('produces a body the cancel schema accepts', () => {
    const body = buildRsvpUpdateBody(KEY, update)
    // Guards the key names: the Zod schema is strict about these.
    expect(Object.keys(body).sort()).toEqual(['guestsCount', 'name', 'secretKey', 'status'])
  })
})