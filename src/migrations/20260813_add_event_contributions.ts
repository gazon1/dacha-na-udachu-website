import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds the EventContributions collection (voluntary "chip-in" contributions
 * for events) and two new fields on the Events collection.
 *
 * Safe to run on an existing database — uses IF NOT EXISTS where possible.
 * Run via `docker compose run --rm migrate` (the compose service already
 * invokes this automatically before `app` starts).
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // 1. Two new columns on `events`.
  await db.execute(sql`
    ALTER TABLE "events"
      ADD COLUMN IF NOT EXISTS "show_contribution_widget" boolean DEFAULT false NOT NULL,
      ADD COLUMN IF NOT EXISTS "contribution_goal" integer;
  `)

  // 2. Status enum for EventContributions. CREATE TYPE has no IF NOT EXISTS,
  //    so guard manually so a re-run after a partially-applied prior attempt
  //    doesn't fail with "type already exists".
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_event_contributions_status') THEN
        CREATE TYPE "public"."enum_event_contributions_status" AS ENUM('pending', 'confirmed', 'rejected', 'expired');
      END IF;
    END $$;
  `)

  // 3. The EventContributions table itself.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "event_contributions" (
      "id" serial PRIMARY KEY NOT NULL,
      "event_id" integer NOT NULL,
      "name" varchar NOT NULL,
      "amount" numeric NOT NULL,
      "message" varchar,
      "status" "enum_event_contributions_status" DEFAULT 'pending',
      "secret_key" varchar NOT NULL,
      "yoomoney_operation_id" varchar,
      "confirmed_at" timestamp(3) with time zone,
      "sender_firstname" varchar,
      "sender_lastname" varchar,
      "user_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  // 4. Foreign keys (event + optional user).
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'event_contributions_event_id_events_id_fk'
      ) THEN
        ALTER TABLE "event_contributions"
          ADD CONSTRAINT "event_contributions_event_id_events_id_fk"
          FOREIGN KEY ("event_id") REFERENCES "public"."events"("id")
          ON DELETE set null ON UPDATE no action;
      END IF;
    END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'event_contributions_user_id_users_id_fk'
      ) THEN
        ALTER TABLE "event_contributions"
          ADD CONSTRAINT "event_contributions_user_id_users_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
          ON DELETE set null ON UPDATE no action;
      END IF;
    END $$;
  `)

  // 5. Indexes (unique constraint below creates its own backing index,
  //    so we don't add a duplicate one for secret_key here).
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "event_contributions_event_idx" ON "event_contributions" USING btree ("event_id");
    CREATE INDEX IF NOT EXISTS "event_contributions_status_idx" ON "event_contributions" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "event_contributions_yoomoney_operation_id_idx" ON "event_contributions" USING btree ("yoomoney_operation_id");
    CREATE INDEX IF NOT EXISTS "event_contributions_confirmed_at_idx" ON "event_contributions" USING btree ("confirmed_at");
    CREATE INDEX IF NOT EXISTS "event_contributions_created_at_idx" ON "event_contributions" USING btree ("created_at");
  `)

  // 6. Unique constraint on secret_key. The constraint auto-creates a backing
  //    btree index named the same as the constraint, so it doubles as the
  //    secret_key lookup index Payload expects.
  //
  //    A previous version of this migration also added an explicit index with
  //    this name; if such an index is still hanging around from a partial
  //    apply, drop it first so the constraint can take the name.
  await db.execute(sql`
    DROP INDEX IF EXISTS "public"."event_contributions_secret_key_unique";
  `)
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'event_contributions_secret_key_unique'
      ) THEN
        ALTER TABLE "event_contributions"
          ADD CONSTRAINT "event_contributions_secret_key_unique" UNIQUE ("secret_key");
      END IF;
    END $$;
  `)

  // Suppress unused-arg warnings — these are part of the migration contract.
  void payload
  void req
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "event_contributions" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_event_contributions_status";
    ALTER TABLE "events"
      DROP COLUMN IF EXISTS "contribution_goal",
      DROP COLUMN IF EXISTS "show_contribution_widget";
  `)
  void payload
  void req
}