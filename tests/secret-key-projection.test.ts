import { describe, expect, it } from 'vitest'

import {
  projectContribution,
  projectRsvp,
  type ContributionStatusDoc,
  type RsvpStatusDoc,
} from '@/lib/secret-key'

/**
 * These projections are the ONLY thing an unauthenticated caller receives from
 * the secretKey endpoints. Before they existed, both endpoints returned the raw
 * document, leaking the contributor's name, message and payer name, and for
 * RSVPs the `user` relationship (another account's identity).
 *
 * The tests assert the allow-list positively AND negatively: every unwanted
 * field must be absent, so adding a field to a collection can never silently
 * widen what these endpoints expose.
 */

const fullContributionRecord = {
  id: 7,
  status: 'confirmed',
  amount: 1500,
  confirmedAt: '2026-08-14T10:00:00.000Z',
  // Everything below must never leave the server.
  name: 'Иван Петров',
  message: 'С днём рождения!',
  senderFirstname: 'Иван',
  senderLastname: 'Петров',
  yoomoneyOperationId: '998877',
  secretKey: 'super-secret-uuid',
  user: { id: 3, email: 'victim@example.com' },
  event: { id: 2, title: 'День рождения' },
}

const fullRsvpRecord = {
  id: 9,
  name: 'Мария',
  status: 'going',
  guestsCount: 2,
  // Everything below must never leave the server.
  secretKey: 'super-secret-uuid',
  user: { id: 3, telegramId: '424242' },
  attendeeSummary: 'Мария + 1 гостя',
  event: { id: 2, title: 'День рождения' },
}

describe('projectContribution', () => {
  const doc = fullContributionRecord as unknown as ContributionStatusDoc
  const out = projectContribution(doc)

  it('returns exactly the four documented fields', () => {
    expect(Object.keys(out).sort()).toEqual(['amount', 'confirmedAt', 'id', 'status'])
  })

  it('preserves the values the widget reads', () => {
    expect(out.id).toBe(7)
    expect(out.status).toBe('confirmed')
    expect(out.amount).toBe(1500)
    expect(out.confirmedAt).toBe('2026-08-14T10:00:00.000Z')
  })

  it('does not leak the contributor name, message or payer identity', () => {
    expect(out).not.toHaveProperty('name')
    expect(out).not.toHaveProperty('message')
    expect(out).not.toHaveProperty('senderFirstname')
    expect(out).not.toHaveProperty('senderLastname')
    expect(out).not.toHaveProperty('user')
    expect(out).not.toHaveProperty('event')
  })

  it('does not echo the secretKey back to the client', () => {
    expect(out).not.toHaveProperty('secretKey')
  })

  it('normalises a missing confirmedAt to null', () => {
    const pending = { id: 1, status: 'pending', amount: 100 } as ContributionStatusDoc
    expect(projectContribution(pending).confirmedAt).toBeNull()
  })
})

describe('projectRsvp', () => {
  const doc = fullRsvpRecord as unknown as RsvpStatusDoc
  const out = projectRsvp(doc)

  it('returns exactly the four fields the RSVP form needs', () => {
    expect(Object.keys(out).sort()).toEqual(['guestsCount', 'id', 'name', 'status'])
  })

  it('preserves values used to pre-fill the form', () => {
    expect(out.name).toBe('Мария')
    expect(out.status).toBe('going')
    expect(out.guestsCount).toBe(2)
  })

  it('does not leak the linked account or its telegram id', () => {
    expect(out).not.toHaveProperty('user')
    expect(out).not.toHaveProperty('attendeeSummary')
    expect(out).not.toHaveProperty('event')
    expect(out).not.toHaveProperty('secretKey')
  })
})
