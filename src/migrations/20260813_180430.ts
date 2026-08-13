import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_event_contributions_status" AS ENUM('pending', 'confirmed', 'rejected', 'expired');
  CREATE TABLE "event_contributions" (
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
  
  ALTER TABLE "events" ADD COLUMN "show_contribution_widget" boolean DEFAULT false;
  ALTER TABLE "events" ADD COLUMN "contribution_goal" numeric;
  ALTER TABLE "_events_v" ADD COLUMN "version_show_contribution_widget" boolean DEFAULT false;
  ALTER TABLE "_events_v" ADD COLUMN "version_contribution_goal" numeric;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "event_contributions_id" integer;
  ALTER TABLE "event_contributions" ADD CONSTRAINT "event_contributions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "event_contributions" ADD CONSTRAINT "event_contributions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "event_contributions_event_idx" ON "event_contributions" USING btree ("event_id");
  CREATE INDEX "event_contributions_status_idx" ON "event_contributions" USING btree ("status");
  CREATE UNIQUE INDEX "event_contributions_secret_key_idx" ON "event_contributions" USING btree ("secret_key");
  CREATE INDEX "event_contributions_yoomoney_operation_id_idx" ON "event_contributions" USING btree ("yoomoney_operation_id");
  CREATE INDEX "event_contributions_confirmed_at_idx" ON "event_contributions" USING btree ("confirmed_at");
  CREATE INDEX "event_contributions_user_idx" ON "event_contributions" USING btree ("user_id");
  CREATE INDEX "event_contributions_updated_at_idx" ON "event_contributions" USING btree ("updated_at");
  CREATE INDEX "event_contributions_created_at_idx" ON "event_contributions" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_event_contributions_fk" FOREIGN KEY ("event_contributions_id") REFERENCES "public"."event_contributions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_event_contributions_id_idx" ON "payload_locked_documents_rels" USING btree ("event_contributions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "event_contributions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "event_contributions" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_event_contributions_fk";
  
  DROP INDEX "payload_locked_documents_rels_event_contributions_id_idx";
  ALTER TABLE "events" DROP COLUMN "show_contribution_widget";
  ALTER TABLE "events" DROP COLUMN "contribution_goal";
  ALTER TABLE "_events_v" DROP COLUMN "version_show_contribution_widget";
  ALTER TABLE "_events_v" DROP COLUMN "version_contribution_goal";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "event_contributions_id";
  DROP TYPE "public"."enum_event_contributions_status";`)
}
