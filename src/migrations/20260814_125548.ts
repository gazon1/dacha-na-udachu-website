import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "site_settings_telegram_admins" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"label" varchar,
  	"notify_on_contribution" boolean DEFAULT true,
  	"notify_on_booking" boolean DEFAULT true,
  	"notify_on_new_event" boolean DEFAULT true,
  	"notify_on_rsvp" boolean DEFAULT false
  );
  
  ALTER TABLE "site_settings_telegram_admins" ADD CONSTRAINT "site_settings_telegram_admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_telegram_admins" ADD CONSTRAINT "site_settings_telegram_admins_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_settings_telegram_admins_order_idx" ON "site_settings_telegram_admins" USING btree ("_order");
  CREATE INDEX "site_settings_telegram_admins_parent_id_idx" ON "site_settings_telegram_admins" USING btree ("_parent_id");
  CREATE INDEX "site_settings_telegram_admins_user_idx" ON "site_settings_telegram_admins" USING btree ("user_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "site_settings_telegram_admins" CASCADE;`)
}
