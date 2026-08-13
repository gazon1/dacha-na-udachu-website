import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds the `event_contributions_id` column to the system `payload_locked_documents_rels`
 * table. Payload uses this table to track admin UI document locks across all
 * collections — every collection must have its own `*_id` column here.
 *
 * Run via `docker compose run --rm migrate`.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "event_contributions_id" integer;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_event_contributions_id_fk'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_event_contributions_id_fk"
          FOREIGN KEY ("event_contributions_id") REFERENCES "public"."event_contributions"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;
  `)
  void payload
  void req
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_event_contributions_id_fk",
      DROP COLUMN IF EXISTS "event_contributions_id";
  `)
  void payload
  void req
}