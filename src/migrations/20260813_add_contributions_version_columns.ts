import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds the contribution columns to the events versions table (`_events_v`).
 * Payload maintains a parallel versions table for any collection with
 * `versions.drafts` enabled (Events has `drafts: { autosave: true }`).
 *
 * Run via `docker compose run --rm migrate`.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "_events_v"
      ADD COLUMN IF NOT EXISTS "version_show_contribution_widget" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "version_contribution_goal" integer;
  `)
  void payload
  void req
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "_events_v"
      DROP COLUMN IF EXISTS "version_contribution_goal",
      DROP COLUMN IF EXISTS "version_show_contribution_widget";
  `)
  void payload
  void req
}