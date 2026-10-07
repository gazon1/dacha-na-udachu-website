/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from '@payload-config'
import { GRAPHQL_PLAYGROUND_GET } from '@payloadcms/next/routes'

/**
 * The GraphQL playground is an interactive schema browser. With GraphQL
 * enabled (`GRAPHQL_ENABLED=true`) it answers with the full schema — every
 * collection, field and relationship — to anyone who requests it, which is
 * free reconnaissance for an attacker mapping a site that holds payment and
 * personal data.
 *
 * It serves no purpose outside local debugging: `GRAPHQL_ENABLED` is off in
 * production, so both this route and /api/graphql are already inert there.
 * This 404 makes the intent explicit and keeps the playground unreachable if
 * GraphQL is ever switched back on without thinking about it.
 *
 * To debug a GraphQL query, run locally with GRAPHQL_ENABLED=true.
 */
export async function GET() {
  return new Response('Not found', { status: 404 })
}