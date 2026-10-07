/**
 * Request builders for the `secretKey` endpoints.
 *
 * Extracted from the widgets so they can be tested without rendering React.
 * The failure they guard against is silent and expensive: putting secretKey
 * back into a URL (or dropping it from the body) still type-checks and still
 * "works" against a stale build, and the symptom the user sees is "my
 * contribution disappeared".
 *
 * Rule these helpers exist to enforce: the secretKey travels in the JSON body,
 * never in the path.
 */

export type BySecretBody = { secretKey: string }

/** POST /api/event-contributions/by-secret */
export function buildContributionBySecretBody(secretKey: string): BySecretBody {
  return { secretKey }
}

export type RsvpUpdate = {
  status: string
  guestsCount: number
  name: string
}

/** POST /api/event-rsvps/submit */
export function buildRsvpSubmitBody(input: {
  eventSlug: string
  name: string
  guestsCount: number
  status: string
}): Record<string, unknown> {
  return {
    event: input.eventSlug,
    name: input.name,
    guestsCount: input.guestsCount,
    status: input.status,
  }
}

/** POST /api/event-rsvps/cancel — secretKey is part of the body, not the path. */
export function buildRsvpUpdateBody(secretKey: string, update: RsvpUpdate): Record<string, unknown> {
  return {
    secretKey,
    status: update.status,
    guestsCount: update.guestsCount,
    name: update.name,
  }
}

/**
 * Endpoints these bodies are sent to. Exported so a test can assert that none
 * of them embed a secret in the path.
 */
export const SECRET_ENDPOINTS = {
  contributionBySecret: '/api/event-contributions/by-secret',
  rsvpBySecret: '/api/event-rsvps/by-secret',
  rsvpSubmit: '/api/event-rsvps/submit',
  rsvpCancel: '/api/event-rsvps/cancel',
} as const