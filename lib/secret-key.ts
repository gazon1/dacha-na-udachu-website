import type { CollectionSlug, PayloadRequest } from 'payload'

/**
 * Look up a document by its `secretKey`.
 *
 * Every `secretKey` endpoint is unauthenticated: that key is the only
 * credential. Centralising the lookup keeps two properties true everywhere:
 *
 *  1. The key is always taken from the request BODY. It must never appear in
 *     a URL — URLs get written to Caddy access logs, browser history and
 *     Referer headers, so an unguessable key in a URL is still a leaked key.
 *  2. The response is an explicit allow-list projection, never the raw
 *     document. Returning the whole document leaked the contributor's name,
 *     message and payer name, and for RSVPs the `user` relationship (another
 *     account's identity).
 *
 * Callers pass the projection explicitly so adding a field to a collection can
 * never silently widen what these public endpoints expose.
 */

/** Parse `{ secretKey }` from a JSON body. Returns null when absent/invalid. */
export async function readSecretKey(req: PayloadRequest): Promise<string | null> {
  const body = (await req.json?.().catch(() => ({}))) as { secretKey?: unknown }
  const key = body?.secretKey
  if (typeof key !== 'string') return null
  const trimmed = key.trim()
  // Matches the Zod schema used by the endpoints: 1..64 chars.
  if (trimmed.length === 0 || trimmed.length > 64) return null
  return trimmed
}

export async function findBySecretKey<T>(
  req: PayloadRequest,
  collection: CollectionSlug,
  secretKey: string,
): Promise<T | null> {
  const res = await req.payload.find({
    collection,
    where: { secretKey: { equals: secretKey } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return (res.docs[0] as unknown as T | undefined) ?? null
}

/** Shape returned by POST /api/event-contributions/by-secret. */
export type ContributionStatusDoc = {
  id: string | number
  status: string
  amount: number
  confirmedAt?: string | null
}

/** Shape returned by POST /api/event-rsvps/by-secret. */
export type RsvpStatusDoc = {
  id: string | number
  name: string
  status: string
  guestsCount: number
}

/**
 * Allow-listed projections. Keep these in sync with the widget types
 * (ExistingRsvp in components/event/RsvpWidget.tsx, MyContribution in
 * components/event/ContributionWidget.tsx).
 */
export function projectContribution(doc: ContributionStatusDoc) {
  return {
    id: doc.id,
    status: doc.status,
    amount: doc.amount,
    confirmedAt: doc.confirmedAt ?? null,
  }
}

export function projectRsvp(doc: RsvpStatusDoc) {
  return {
    id: doc.id,
    name: doc.name,
    status: doc.status,
    guestsCount: doc.guestsCount,
  }
}
