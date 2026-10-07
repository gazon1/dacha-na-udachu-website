import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { sql } from '@payloadcms/db-postgres'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { createLimiter, getIp } from '@/lib/rate-limit'

/**
 * These tests exercise the limiter against a REAL Postgres, because the thing
 * worth testing is the SQL: a single INSERT .. ON CONFLICT that trims the
 * window and counts in one atomic statement. A hand-written fake would only
 * assert that the fake agrees with itself — the original in-memory version
 * passed every conceivable unit test and still gave each instance its own limit.
 *
 * Skipped unless DATABASE_URL points at a database the suite may write to. CI
 * provides one via a postgres service container.
 */
const url = process.env.DATABASE_URL
const describeDb = url ? describe : describe.skip

const TABLE = 'rate_limit_windows'

describeDb('/api rate limiter against Postgres', () => {
  let db: ReturnType<typeof drizzle>
  let pool: Pool

  beforeAll(async () => {
    pool = new Pool({ connectionString: url!, max: 2 })
    db = drizzle(pool)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${TABLE}" (
        "bucket" varchar NOT NULL PRIMARY KEY,
        "hits" bigint[] NOT NULL DEFAULT ARRAY[]::bigint[],
        "expires_at" timestamp(3) with time zone NOT NULL
      )
    `)
  })

  afterAll(async () => {
    await pool.query(`DROP TABLE IF EXISTS "${TABLE}"`)
    await pool.end()
  })

  const req = (ip: string) =>
    ({
      headers: new Headers({ 'x-real-ip': ip }),
      payload: { db },
    }) as never

  it('admits up to the limit and rejects the next request', async () => {
    const limiter = createLimiter({ name: 'test_admit', windowMs: 60_000, max: 3 })
    const ip = '10.0.0.1'

    for (let i = 1; i <= 3; i++) {
      expect(await limiter.check(req(ip)), `request ${i} should be admitted`).toBe(true)
    }
    expect(await limiter.check(req(ip)), 'request 4 exceeds the limit').toBe(false)
    expect(await limiter.check(req(ip)), 'and stays rejected').toBe(false)
  })

  it('counts each client separately', async () => {
    const limiter = createLimiter({ name: 'test_isolation', windowMs: 60_000, max: 1 })

    expect(await limiter.check(req('10.0.0.2'))).toBe(true)
    expect(await limiter.check(req('10.0.0.2'))).toBe(false)
    // A different IP must not be affected by the first one burning its limit.
    expect(await limiter.check(req('10.0.0.3'))).toBe(true)
  })

  it('shares the counter between "instances"', async () => {
    // Two limiters with the same name and window are two app instances. The
    // whole point of moving to Postgres: a shared counter, not a per-process
    // Map. In the old implementation each createLimiter() had its own hits.
    const instanceA = createLimiter({ name: 'test_shared', windowMs: 60_000, max: 2 })
    const instanceB = createLimiter({ name: 'test_shared', windowMs: 60_000, max: 2 })
    const ip = '10.0.0.4'

    expect(await instanceA.check(req(ip))).toBe(true)
    expect(await instanceB.check(req(ip))).toBe(true)
    // Third request, through the other instance, must see BOTH earlier hits.
    expect(await instanceB.check(req(ip))).toBe(false)
  })

  it('never stores more than max + 1 timestamps', async () => {
    // The array is trimmed on every hit, so a flood cannot grow the row.
    const limiter = createLimiter({ name: 'test_cap', windowMs: 600_000, max: 2 })
    const ip = '10.0.0.5'
    for (let i = 0; i < 25; i++) await limiter.check(req(ip))

    const rows = await db.execute(sql`
      SELECT cardinality("hits") AS count
      FROM rate_limit_windows
      WHERE "bucket" = ${'test_cap:' + ip}
    `)
    const count = Number((rows as { rows: Array<{ count: number }> }).rows[0].count)
    expect(count).toBeLessThanOrEqual(3) // max + 1
  })

  it('drops hits that fall out of the window', async () => {
    // The window must outlive a round trip here: expires_at is now + windowMs,
    // and the periodic sweep deletes rows whose expires_at has passed, so a 1ms
    // window would be cleared by the sweep rather than by the trimming logic.
    const limiter = createLimiter({ name: 'test_window', windowMs: 250, max: 1 })
    const ip = '10.0.0.6'

    expect(await limiter.check(req(ip))).toBe(true)
    expect(await limiter.check(req(ip))).toBe(false)
    await new Promise((r) => setTimeout(r, 400))
    expect(await limiter.check(req(ip)), 'stale hit must not count').toBe(true)
  })
})

describe('getIp', () => {
  const withHeaders = (h: Record<string, string>) =>
    ({ headers: new Headers(h) }) as never

  it('prefers the first entry of x-forwarded-for', () => {
    expect(getIp(withHeaders({ 'x-forwarded-for': '203.0.113.5, 70.41.3.18' }))).toBe(
      '203.0.113.5',
    )
  })

  it('falls back to x-real-ip, which Caddy sets', () => {
    expect(getIp(withHeaders({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7')
  })

  it('never returns empty, or all clients share one bucket', () => {
    expect(getIp(withHeaders({}))).toBe('unknown')
  })
})