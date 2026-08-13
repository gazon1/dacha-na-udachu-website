import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "telegram_subscribers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"telegram_id" varchar NOT NULL,
  	"chat_id" varchar NOT NULL,
  	"first_name" varchar,
  	"username" varchar,
  	"subscribed_at" timestamp(3) with time zone NOT NULL,
  	"opted_out_at" timestamp(3) with time zone,
  	"user_id" integer,
  	"last_notified_event_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "telegram_subscribers_id" integer;
  ALTER TABLE "telegram_subscribers" ADD CONSTRAINT "telegram_subscribers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "telegram_subscribers_telegram_id_idx" ON "telegram_subscribers" USING btree ("telegram_id");
  CREATE INDEX "telegram_subscribers_opted_out_at_idx" ON "telegram_subscribers" USING btree ("opted_out_at");
  CREATE INDEX "telegram_subscribers_user_idx" ON "telegram_subscribers" USING btree ("user_id");
  CREATE INDEX "telegram_subscribers_last_notified_event_id_idx" ON "telegram_subscribers" USING btree ("last_notified_event_id");
  CREATE INDEX "telegram_subscribers_updated_at_idx" ON "telegram_subscribers" USING btree ("updated_at");
  CREATE INDEX "telegram_subscribers_created_at_idx" ON "telegram_subscribers" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_telegram_subscribers_fk" FOREIGN KEY ("telegram_subscribers_id") REFERENCES "public"."telegram_subscribers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_telegram_subscribers_id_idx" ON "payload_locked_documents_rels" USING btree ("telegram_subscribers_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "telegram_subscribers" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "telegram_subscribers" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_telegram_subscribers_fk";
  
  DROP INDEX "payload_locked_documents_rels_telegram_subscribers_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "telegram_subscribers_id";`)
}
