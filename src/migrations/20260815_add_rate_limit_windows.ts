import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Shared rate-limit state, replacing the per-process `Map` in lib/rate-limit.ts.
 *
 * One row per (limiter, client) pair. `hits` holds the epoch-millisecond
 * timestamps still inside the sliding window, so the stored array is bounded by
 * the limit itself and old entries disappear as a side effect of the next
 * request rather than needing a sweeper.
 *
 * This table is deliberately NOT a Payload collection: `push: true` reconciles
 * only tables Payload knows about, and rate-limit bookkeeping must never be
 * dropped by a schema push during deploy.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "rate_limit_windows" (
      "bucket" varchar NOT NULL,
      "hits" bigint[] NOT NULL DEFAULT '{}',
      "expires_at" timestamp(3) with time zone NOT NULL,
      CONSTRAINT "rate_limit_windows_pkey" PRIMARY KEY ("bucket")
    );
  `)

  // Cleanup deletes by expires_at; without this index the sweep is a seq scan.
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "rate_limit_windows_expires_at_idx"
      ON "rate_limit_windows" USING btree ("expires_at");
  `)

  void payload
  void req
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "rate_limit_windows" CASCADE;
  `)
  void payload
  void req
}