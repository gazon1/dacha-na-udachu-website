import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * Guards the exact bug that made a deploy "successful" while the app was
 * unreachable: the health route declared `force-static`, so Next baked
 * {"status":"ok"} into the build output and served it with
 * `cache-control: s-maxage=31536000`. Both the Docker healthcheck and the
 * deploy smoke test read that cached body — `ts` was frozen at build time —
 * so a dead process kept reporting healthy and every deploy went green.
 *
 * Reading the source rather than calling the route keeps this honest: the
 * failure mode is a route *config* flag, not runtime behaviour, and an
 * integration test would exercise the dev server where the flag does not
 * produce a cache header at all.
 */
const routePath = fileURLToPath(
  new URL('../app/(frontend)/api/health/route.ts', import.meta.url),
)

/** Comments mention the flag this test forbids, so strip them before matching. */
const source = readFileSync(routePath, 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

describe('/api/health', () => {
  it('is not statically prerendered', () => {
    expect(source).toMatch(/export const dynamic\s*=\s*'force-dynamic'/)
    expect(source).not.toMatch(/force-static/)
  })

  it('does not disable revalidation for the probe', () => {
    expect(source).not.toMatch(/export const revalidate\s*=\s*false/)
  })
})