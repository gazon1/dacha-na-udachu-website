import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Singleton Payload instance per Node.js process.
 *
 * Payload's getPayload() caches the instance internally — calling it multiple
 * times is cheap, but we wrap it for type safety and to allow swapping the
 * config in tests.
 *
 * Use this in Server Components, Route Handlers, and Payload endpoints.
 * DO NOT import in Client Components.
 */
let payloadPromise: ReturnType<typeof getPayload> | null = null

export async function getPayloadClient() {
  if (!payloadPromise) {
    payloadPromise = getPayload({ config })
  }
  return payloadPromise
}

export { config as payloadConfig }