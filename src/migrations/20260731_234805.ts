import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('user', 'admin');
  CREATE TYPE "public"."enum_houses_blocks_heading_level" AS ENUM('h2', 'h3', 'h4');
  CREATE TYPE "public"."enum_houses_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__houses_v_blocks_heading_level" AS ENUM('h2', 'h3', 'h4');
  CREATE TYPE "public"."enum__houses_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_events_blocks_heading_level" AS ENUM('h2', 'h3', 'h4');
  CREATE TYPE "public"."enum_events_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__events_v_blocks_heading_level" AS ENUM('h2', 'h3', 'h4');
  CREATE TYPE "public"."enum__events_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_news_blocks_heading_level" AS ENUM('h2', 'h3', 'h4');
  CREATE TYPE "public"."enum_news_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__news_v_blocks_heading_level" AS ENUM('h2', 'h3', 'h4');
  CREATE TYPE "public"."enum__news_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_faq_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__faq_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_event_rsvps_status" AS ENUM('going', 'maybe', 'not_going', 'waiting');
  CREATE TYPE "public"."enum_event_drivers_contact_preference" AS ENUM('telegram', 'phone', 'both');
  CREATE TYPE "public"."enum_ride_passengers_status" AS ENUM('pending', 'confirmed', 'cancelled');
  CREATE TYPE "public"."enum_taxi_pools_service" AS ENUM('yandex', 'citymobil', 'other');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"telegram_id" varchar NOT NULL,
  	"first_name" varchar,
  	"last_name" varchar,
  	"telegram_username" varchar,
  	"telegram_photo_url" varchar,
  	"role" "enum_users_role" DEFAULT 'user' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"caption" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar
  );
  
  CREATE TABLE "houses_blocks_heading" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"level" "enum_houses_blocks_heading_level" DEFAULT 'h2',
  	"block_name" varchar
  );
  
  CREATE TABLE "houses_blocks_paragraph" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "houses_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "houses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"title" varchar,
  	"summary" varchar,
  	"hero_image_id" integer,
  	"capacity" numeric DEFAULT 1,
  	"bedrooms" numeric DEFAULT 1,
  	"address" varchar,
  	"base_price" numeric DEFAULT 0,
  	"booking_enabled" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_houses_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_houses_v_blocks_heading" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"level" "enum__houses_v_blocks_heading_level" DEFAULT 'h2',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_houses_v_blocks_paragraph" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_houses_v_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_houses_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_hero_image_id" integer,
  	"version_capacity" numeric DEFAULT 1,
  	"version_bedrooms" numeric DEFAULT 1,
  	"version_address" varchar,
  	"version_base_price" numeric DEFAULT 0,
  	"version_booking_enabled" boolean DEFAULT true,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__houses_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "events_blocks_heading" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"level" "enum_events_blocks_heading_level" DEFAULT 'h2',
  	"block_name" varchar
  );
  
  CREATE TABLE "events_blocks_paragraph" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "events_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "events_blocks_info_card" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" varchar DEFAULT 'info',
  	"title" varchar,
  	"content" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "events_blocks_faq_item" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "events_blocks_cta_card" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"highlighted" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "events_blocks_amenity_item" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" varchar DEFAULT 'check',
  	"label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"title" varchar,
  	"start_date" timestamp(3) with time zone,
  	"end_date" timestamp(3) with time zone,
  	"start_time" varchar,
  	"venue" varchar,
  	"venue_notes" varchar,
  	"map_link" varchar,
  	"hero_image_id" integer,
  	"summary" varchar,
  	"show_countdown" boolean DEFAULT false,
  	"expected_temperature" varchar,
  	"weather_note" varchar,
  	"special_tag" varchar,
  	"rsvp_capacity" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_events_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_events_v_blocks_heading" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"level" "enum__events_v_blocks_heading_level" DEFAULT 'h2',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_events_v_blocks_paragraph" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_events_v_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_events_v_blocks_info_card" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" varchar DEFAULT 'info',
  	"title" varchar,
  	"content" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_events_v_blocks_faq_item" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_events_v_blocks_cta_card" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"highlighted" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_events_v_blocks_amenity_item" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" varchar DEFAULT 'check',
  	"label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_events_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_title" varchar,
  	"version_start_date" timestamp(3) with time zone,
  	"version_end_date" timestamp(3) with time zone,
  	"version_start_time" varchar,
  	"version_venue" varchar,
  	"version_venue_notes" varchar,
  	"version_map_link" varchar,
  	"version_hero_image_id" integer,
  	"version_summary" varchar,
  	"version_show_countdown" boolean DEFAULT false,
  	"version_expected_temperature" varchar,
  	"version_weather_note" varchar,
  	"version_special_tag" varchar,
  	"version_rsvp_capacity" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__events_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "news_blocks_heading" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"level" "enum_news_blocks_heading_level" DEFAULT 'h2',
  	"block_name" varchar
  );
  
  CREATE TABLE "news_blocks_paragraph" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "news_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "news" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"title" varchar,
  	"date" timestamp(3) with time zone,
  	"author" varchar,
  	"main_image_id" integer,
  	"summary" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_news_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_news_v_blocks_heading" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"level" "enum__news_v_blocks_heading_level" DEFAULT 'h2',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_news_v_blocks_paragraph" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_news_v_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_news_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_title" varchar,
  	"version_date" timestamp(3) with time zone,
  	"version_author" varchar,
  	"version_main_image_id" integer,
  	"version_summary" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__news_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "faq_blocks_paragraph" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "faq_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "faq" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar DEFAULT 'faq',
  	"title" varchar DEFAULT 'Вопросы и ответы',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_faq_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_faq_v_blocks_paragraph" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_faq_v_version_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_faq_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar DEFAULT 'faq',
  	"version_title" varchar DEFAULT 'Вопросы и ответы',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__faq_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "bookings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"house_id" integer NOT NULL,
  	"check_in" timestamp(3) with time zone NOT NULL,
  	"check_out" timestamp(3) with time zone NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"telegram" varchar,
  	"guest_num" numeric DEFAULT 1,
  	"is_confirmed" boolean DEFAULT false,
  	"options" jsonb DEFAULT '{}'::jsonb,
  	"base_price" numeric DEFAULT 0,
  	"extras_price" numeric DEFAULT 0,
  	"total_price" numeric DEFAULT 0,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "event_rsvps" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"status" "enum_event_rsvps_status" DEFAULT 'going',
  	"guests_count" numeric DEFAULT 1,
  	"secret_key" varchar NOT NULL,
  	"user_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "event_drivers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"telegram" varchar,
  	"phone" varchar,
  	"car_model" varchar,
  	"car_type" varchar,
  	"seats_total" numeric DEFAULT 4,
  	"departure_date" timestamp(3) with time zone NOT NULL,
  	"departure_time" varchar,
  	"departure_location" varchar NOT NULL,
  	"return_date" timestamp(3) with time zone,
  	"return_time" varchar,
  	"notes" varchar,
  	"contact_preference" "enum_event_drivers_contact_preference" DEFAULT 'both',
  	"is_verified" boolean DEFAULT false,
  	"is_cancelled" boolean DEFAULT false,
  	"cancel_token" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ride_passengers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"driver_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"telegram" varchar,
  	"phone" varchar,
  	"seats" numeric DEFAULT 1,
  	"pickup_location" varchar,
  	"notes" varchar,
  	"status" "enum_ride_passengers_status" DEFAULT 'pending',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "carpool_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"telegram" varchar,
  	"phone" varchar,
  	"pickup_location" varchar,
  	"seats_needed" numeric DEFAULT 1,
  	"flexible_time" boolean DEFAULT true,
  	"can_share_gas" boolean DEFAULT false,
  	"notes" varchar,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "taxi_pools" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" integer NOT NULL,
  	"organizer" varchar NOT NULL,
  	"telegram" varchar,
  	"pickup_location" varchar NOT NULL,
  	"departure_date" timestamp(3) with time zone NOT NULL,
  	"departure_time" varchar NOT NULL,
  	"max_passengers" numeric DEFAULT 4,
  	"estimated_price" varchar,
  	"service" "enum_taxi_pools_service" DEFAULT 'other',
  	"notes" varchar,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "taxi_passengers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"taxi_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"telegram" varchar,
  	"phone" varchar,
  	"seats" numeric DEFAULT 1,
  	"notes" varchar,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "newsletter_signups" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"subscribed_at" timestamp(3) with time zone NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"ip_address" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "extra_services" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"price" numeric DEFAULT 0,
  	"is_active" boolean DEFAULT true,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"houses_id" integer,
  	"events_id" integer,
  	"news_id" integer,
  	"faq_id" integer,
  	"bookings_id" integer,
  	"event_rsvps_id" integer,
  	"event_drivers_id" integer,
  	"ride_passengers_id" integer,
  	"carpool_requests_id" integer,
  	"taxi_pools_id" integer,
  	"taxi_passengers_id" integer,
  	"newsletter_signups_id" integer,
  	"extra_services_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"icon" varchar,
  	"img" varchar
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"brand_name" varchar DEFAULT 'Дача на удачу' NOT NULL,
  	"brand_tagline" varchar DEFAULT 'Уютное пространство для встреч, мероприятий и отдыха',
  	"brand_copyright" varchar DEFAULT 'Дача на удачу. Все права защищены.',
  	"contacts_email" varchar DEFAULT 'hello@example.com',
  	"contacts_phone" varchar DEFAULT '+7 (000) 000-00-00',
  	"contacts_address" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "houses_blocks_heading" ADD CONSTRAINT "houses_blocks_heading_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."houses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "houses_blocks_paragraph" ADD CONSTRAINT "houses_blocks_paragraph_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."houses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "houses_blocks_image" ADD CONSTRAINT "houses_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "houses_blocks_image" ADD CONSTRAINT "houses_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."houses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "houses" ADD CONSTRAINT "houses_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_houses_v_blocks_heading" ADD CONSTRAINT "_houses_v_blocks_heading_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_houses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_houses_v_blocks_paragraph" ADD CONSTRAINT "_houses_v_blocks_paragraph_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_houses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_houses_v_blocks_image" ADD CONSTRAINT "_houses_v_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_houses_v_blocks_image" ADD CONSTRAINT "_houses_v_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_houses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_houses_v" ADD CONSTRAINT "_houses_v_parent_id_houses_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."houses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_houses_v" ADD CONSTRAINT "_houses_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_blocks_heading" ADD CONSTRAINT "events_blocks_heading_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_blocks_paragraph" ADD CONSTRAINT "events_blocks_paragraph_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_blocks_image" ADD CONSTRAINT "events_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_blocks_image" ADD CONSTRAINT "events_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_blocks_info_card" ADD CONSTRAINT "events_blocks_info_card_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_blocks_faq_item" ADD CONSTRAINT "events_blocks_faq_item_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_blocks_cta_card" ADD CONSTRAINT "events_blocks_cta_card_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_blocks_amenity_item" ADD CONSTRAINT "events_blocks_amenity_item_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v_blocks_heading" ADD CONSTRAINT "_events_v_blocks_heading_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_blocks_paragraph" ADD CONSTRAINT "_events_v_blocks_paragraph_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_blocks_image" ADD CONSTRAINT "_events_v_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v_blocks_image" ADD CONSTRAINT "_events_v_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_blocks_info_card" ADD CONSTRAINT "_events_v_blocks_info_card_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_blocks_faq_item" ADD CONSTRAINT "_events_v_blocks_faq_item_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_blocks_cta_card" ADD CONSTRAINT "_events_v_blocks_cta_card_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_blocks_amenity_item" ADD CONSTRAINT "_events_v_blocks_amenity_item_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_parent_id_events_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_blocks_heading" ADD CONSTRAINT "news_blocks_heading_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_blocks_paragraph" ADD CONSTRAINT "news_blocks_paragraph_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_blocks_image" ADD CONSTRAINT "news_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_blocks_image" ADD CONSTRAINT "news_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news" ADD CONSTRAINT "news_main_image_id_media_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_heading" ADD CONSTRAINT "_news_v_blocks_heading_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_paragraph" ADD CONSTRAINT "_news_v_blocks_paragraph_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_image" ADD CONSTRAINT "_news_v_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_image" ADD CONSTRAINT "_news_v_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_parent_id_news_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."news"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_version_main_image_id_media_id_fk" FOREIGN KEY ("version_main_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "faq_blocks_paragraph" ADD CONSTRAINT "faq_blocks_paragraph_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faq_faq_items" ADD CONSTRAINT "faq_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faq_v_blocks_paragraph" ADD CONSTRAINT "_faq_v_blocks_paragraph_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_faq_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faq_v_version_faq_items" ADD CONSTRAINT "_faq_v_version_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_faq_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faq_v" ADD CONSTRAINT "_faq_v_parent_id_faq_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."faq"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_house_id_houses_id_fk" FOREIGN KEY ("house_id") REFERENCES "public"."houses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "event_drivers" ADD CONSTRAINT "event_drivers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ride_passengers" ADD CONSTRAINT "ride_passengers_driver_id_event_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."event_drivers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carpool_requests" ADD CONSTRAINT "carpool_requests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "taxi_pools" ADD CONSTRAINT "taxi_pools_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "taxi_passengers" ADD CONSTRAINT "taxi_passengers_taxi_id_taxi_pools_id_fk" FOREIGN KEY ("taxi_id") REFERENCES "public"."taxi_pools"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_houses_fk" FOREIGN KEY ("houses_id") REFERENCES "public"."houses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_news_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_faq_fk" FOREIGN KEY ("faq_id") REFERENCES "public"."faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_bookings_fk" FOREIGN KEY ("bookings_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_event_rsvps_fk" FOREIGN KEY ("event_rsvps_id") REFERENCES "public"."event_rsvps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_event_drivers_fk" FOREIGN KEY ("event_drivers_id") REFERENCES "public"."event_drivers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ride_passengers_fk" FOREIGN KEY ("ride_passengers_id") REFERENCES "public"."ride_passengers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_carpool_requests_fk" FOREIGN KEY ("carpool_requests_id") REFERENCES "public"."carpool_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_taxi_pools_fk" FOREIGN KEY ("taxi_pools_id") REFERENCES "public"."taxi_pools"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_taxi_passengers_fk" FOREIGN KEY ("taxi_passengers_id") REFERENCES "public"."taxi_passengers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_newsletter_signups_fk" FOREIGN KEY ("newsletter_signups_id") REFERENCES "public"."newsletter_signups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_extra_services_fk" FOREIGN KEY ("extra_services_id") REFERENCES "public"."extra_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_social_links" ADD CONSTRAINT "site_settings_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "users_telegram_id_idx" ON "users" USING btree ("telegram_id");
  CREATE INDEX "users_role_idx" ON "users" USING btree ("role");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE INDEX "houses_blocks_heading_order_idx" ON "houses_blocks_heading" USING btree ("_order");
  CREATE INDEX "houses_blocks_heading_parent_id_idx" ON "houses_blocks_heading" USING btree ("_parent_id");
  CREATE INDEX "houses_blocks_heading_path_idx" ON "houses_blocks_heading" USING btree ("_path");
  CREATE INDEX "houses_blocks_paragraph_order_idx" ON "houses_blocks_paragraph" USING btree ("_order");
  CREATE INDEX "houses_blocks_paragraph_parent_id_idx" ON "houses_blocks_paragraph" USING btree ("_parent_id");
  CREATE INDEX "houses_blocks_paragraph_path_idx" ON "houses_blocks_paragraph" USING btree ("_path");
  CREATE INDEX "houses_blocks_image_order_idx" ON "houses_blocks_image" USING btree ("_order");
  CREATE INDEX "houses_blocks_image_parent_id_idx" ON "houses_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "houses_blocks_image_path_idx" ON "houses_blocks_image" USING btree ("_path");
  CREATE INDEX "houses_blocks_image_image_idx" ON "houses_blocks_image" USING btree ("image_id");
  CREATE UNIQUE INDEX "houses_slug_idx" ON "houses" USING btree ("slug");
  CREATE INDEX "houses_hero_image_idx" ON "houses" USING btree ("hero_image_id");
  CREATE INDEX "houses_base_price_idx" ON "houses" USING btree ("base_price");
  CREATE INDEX "houses_booking_enabled_idx" ON "houses" USING btree ("booking_enabled");
  CREATE INDEX "houses_updated_at_idx" ON "houses" USING btree ("updated_at");
  CREATE INDEX "houses_created_at_idx" ON "houses" USING btree ("created_at");
  CREATE INDEX "houses__status_idx" ON "houses" USING btree ("_status");
  CREATE INDEX "_houses_v_blocks_heading_order_idx" ON "_houses_v_blocks_heading" USING btree ("_order");
  CREATE INDEX "_houses_v_blocks_heading_parent_id_idx" ON "_houses_v_blocks_heading" USING btree ("_parent_id");
  CREATE INDEX "_houses_v_blocks_heading_path_idx" ON "_houses_v_blocks_heading" USING btree ("_path");
  CREATE INDEX "_houses_v_blocks_paragraph_order_idx" ON "_houses_v_blocks_paragraph" USING btree ("_order");
  CREATE INDEX "_houses_v_blocks_paragraph_parent_id_idx" ON "_houses_v_blocks_paragraph" USING btree ("_parent_id");
  CREATE INDEX "_houses_v_blocks_paragraph_path_idx" ON "_houses_v_blocks_paragraph" USING btree ("_path");
  CREATE INDEX "_houses_v_blocks_image_order_idx" ON "_houses_v_blocks_image" USING btree ("_order");
  CREATE INDEX "_houses_v_blocks_image_parent_id_idx" ON "_houses_v_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "_houses_v_blocks_image_path_idx" ON "_houses_v_blocks_image" USING btree ("_path");
  CREATE INDEX "_houses_v_blocks_image_image_idx" ON "_houses_v_blocks_image" USING btree ("image_id");
  CREATE INDEX "_houses_v_parent_idx" ON "_houses_v" USING btree ("parent_id");
  CREATE INDEX "_houses_v_version_version_slug_idx" ON "_houses_v" USING btree ("version_slug");
  CREATE INDEX "_houses_v_version_version_hero_image_idx" ON "_houses_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_houses_v_version_version_base_price_idx" ON "_houses_v" USING btree ("version_base_price");
  CREATE INDEX "_houses_v_version_version_booking_enabled_idx" ON "_houses_v" USING btree ("version_booking_enabled");
  CREATE INDEX "_houses_v_version_version_updated_at_idx" ON "_houses_v" USING btree ("version_updated_at");
  CREATE INDEX "_houses_v_version_version_created_at_idx" ON "_houses_v" USING btree ("version_created_at");
  CREATE INDEX "_houses_v_version_version__status_idx" ON "_houses_v" USING btree ("version__status");
  CREATE INDEX "_houses_v_created_at_idx" ON "_houses_v" USING btree ("created_at");
  CREATE INDEX "_houses_v_updated_at_idx" ON "_houses_v" USING btree ("updated_at");
  CREATE INDEX "_houses_v_latest_idx" ON "_houses_v" USING btree ("latest");
  CREATE INDEX "_houses_v_autosave_idx" ON "_houses_v" USING btree ("autosave");
  CREATE INDEX "events_blocks_heading_order_idx" ON "events_blocks_heading" USING btree ("_order");
  CREATE INDEX "events_blocks_heading_parent_id_idx" ON "events_blocks_heading" USING btree ("_parent_id");
  CREATE INDEX "events_blocks_heading_path_idx" ON "events_blocks_heading" USING btree ("_path");
  CREATE INDEX "events_blocks_paragraph_order_idx" ON "events_blocks_paragraph" USING btree ("_order");
  CREATE INDEX "events_blocks_paragraph_parent_id_idx" ON "events_blocks_paragraph" USING btree ("_parent_id");
  CREATE INDEX "events_blocks_paragraph_path_idx" ON "events_blocks_paragraph" USING btree ("_path");
  CREATE INDEX "events_blocks_image_order_idx" ON "events_blocks_image" USING btree ("_order");
  CREATE INDEX "events_blocks_image_parent_id_idx" ON "events_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "events_blocks_image_path_idx" ON "events_blocks_image" USING btree ("_path");
  CREATE INDEX "events_blocks_image_image_idx" ON "events_blocks_image" USING btree ("image_id");
  CREATE INDEX "events_blocks_info_card_order_idx" ON "events_blocks_info_card" USING btree ("_order");
  CREATE INDEX "events_blocks_info_card_parent_id_idx" ON "events_blocks_info_card" USING btree ("_parent_id");
  CREATE INDEX "events_blocks_info_card_path_idx" ON "events_blocks_info_card" USING btree ("_path");
  CREATE INDEX "events_blocks_faq_item_order_idx" ON "events_blocks_faq_item" USING btree ("_order");
  CREATE INDEX "events_blocks_faq_item_parent_id_idx" ON "events_blocks_faq_item" USING btree ("_parent_id");
  CREATE INDEX "events_blocks_faq_item_path_idx" ON "events_blocks_faq_item" USING btree ("_path");
  CREATE INDEX "events_blocks_cta_card_order_idx" ON "events_blocks_cta_card" USING btree ("_order");
  CREATE INDEX "events_blocks_cta_card_parent_id_idx" ON "events_blocks_cta_card" USING btree ("_parent_id");
  CREATE INDEX "events_blocks_cta_card_path_idx" ON "events_blocks_cta_card" USING btree ("_path");
  CREATE INDEX "events_blocks_amenity_item_order_idx" ON "events_blocks_amenity_item" USING btree ("_order");
  CREATE INDEX "events_blocks_amenity_item_parent_id_idx" ON "events_blocks_amenity_item" USING btree ("_parent_id");
  CREATE INDEX "events_blocks_amenity_item_path_idx" ON "events_blocks_amenity_item" USING btree ("_path");
  CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");
  CREATE INDEX "events_start_date_idx" ON "events" USING btree ("start_date");
  CREATE INDEX "events_hero_image_idx" ON "events" USING btree ("hero_image_id");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "events__status_idx" ON "events" USING btree ("_status");
  CREATE INDEX "_events_v_blocks_heading_order_idx" ON "_events_v_blocks_heading" USING btree ("_order");
  CREATE INDEX "_events_v_blocks_heading_parent_id_idx" ON "_events_v_blocks_heading" USING btree ("_parent_id");
  CREATE INDEX "_events_v_blocks_heading_path_idx" ON "_events_v_blocks_heading" USING btree ("_path");
  CREATE INDEX "_events_v_blocks_paragraph_order_idx" ON "_events_v_blocks_paragraph" USING btree ("_order");
  CREATE INDEX "_events_v_blocks_paragraph_parent_id_idx" ON "_events_v_blocks_paragraph" USING btree ("_parent_id");
  CREATE INDEX "_events_v_blocks_paragraph_path_idx" ON "_events_v_blocks_paragraph" USING btree ("_path");
  CREATE INDEX "_events_v_blocks_image_order_idx" ON "_events_v_blocks_image" USING btree ("_order");
  CREATE INDEX "_events_v_blocks_image_parent_id_idx" ON "_events_v_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "_events_v_blocks_image_path_idx" ON "_events_v_blocks_image" USING btree ("_path");
  CREATE INDEX "_events_v_blocks_image_image_idx" ON "_events_v_blocks_image" USING btree ("image_id");
  CREATE INDEX "_events_v_blocks_info_card_order_idx" ON "_events_v_blocks_info_card" USING btree ("_order");
  CREATE INDEX "_events_v_blocks_info_card_parent_id_idx" ON "_events_v_blocks_info_card" USING btree ("_parent_id");
  CREATE INDEX "_events_v_blocks_info_card_path_idx" ON "_events_v_blocks_info_card" USING btree ("_path");
  CREATE INDEX "_events_v_blocks_faq_item_order_idx" ON "_events_v_blocks_faq_item" USING btree ("_order");
  CREATE INDEX "_events_v_blocks_faq_item_parent_id_idx" ON "_events_v_blocks_faq_item" USING btree ("_parent_id");
  CREATE INDEX "_events_v_blocks_faq_item_path_idx" ON "_events_v_blocks_faq_item" USING btree ("_path");
  CREATE INDEX "_events_v_blocks_cta_card_order_idx" ON "_events_v_blocks_cta_card" USING btree ("_order");
  CREATE INDEX "_events_v_blocks_cta_card_parent_id_idx" ON "_events_v_blocks_cta_card" USING btree ("_parent_id");
  CREATE INDEX "_events_v_blocks_cta_card_path_idx" ON "_events_v_blocks_cta_card" USING btree ("_path");
  CREATE INDEX "_events_v_blocks_amenity_item_order_idx" ON "_events_v_blocks_amenity_item" USING btree ("_order");
  CREATE INDEX "_events_v_blocks_amenity_item_parent_id_idx" ON "_events_v_blocks_amenity_item" USING btree ("_parent_id");
  CREATE INDEX "_events_v_blocks_amenity_item_path_idx" ON "_events_v_blocks_amenity_item" USING btree ("_path");
  CREATE INDEX "_events_v_parent_idx" ON "_events_v" USING btree ("parent_id");
  CREATE INDEX "_events_v_version_version_slug_idx" ON "_events_v" USING btree ("version_slug");
  CREATE INDEX "_events_v_version_version_start_date_idx" ON "_events_v" USING btree ("version_start_date");
  CREATE INDEX "_events_v_version_version_hero_image_idx" ON "_events_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_events_v_version_version_updated_at_idx" ON "_events_v" USING btree ("version_updated_at");
  CREATE INDEX "_events_v_version_version_created_at_idx" ON "_events_v" USING btree ("version_created_at");
  CREATE INDEX "_events_v_version_version__status_idx" ON "_events_v" USING btree ("version__status");
  CREATE INDEX "_events_v_created_at_idx" ON "_events_v" USING btree ("created_at");
  CREATE INDEX "_events_v_updated_at_idx" ON "_events_v" USING btree ("updated_at");
  CREATE INDEX "_events_v_latest_idx" ON "_events_v" USING btree ("latest");
  CREATE INDEX "_events_v_autosave_idx" ON "_events_v" USING btree ("autosave");
  CREATE INDEX "news_blocks_heading_order_idx" ON "news_blocks_heading" USING btree ("_order");
  CREATE INDEX "news_blocks_heading_parent_id_idx" ON "news_blocks_heading" USING btree ("_parent_id");
  CREATE INDEX "news_blocks_heading_path_idx" ON "news_blocks_heading" USING btree ("_path");
  CREATE INDEX "news_blocks_paragraph_order_idx" ON "news_blocks_paragraph" USING btree ("_order");
  CREATE INDEX "news_blocks_paragraph_parent_id_idx" ON "news_blocks_paragraph" USING btree ("_parent_id");
  CREATE INDEX "news_blocks_paragraph_path_idx" ON "news_blocks_paragraph" USING btree ("_path");
  CREATE INDEX "news_blocks_image_order_idx" ON "news_blocks_image" USING btree ("_order");
  CREATE INDEX "news_blocks_image_parent_id_idx" ON "news_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "news_blocks_image_path_idx" ON "news_blocks_image" USING btree ("_path");
  CREATE INDEX "news_blocks_image_image_idx" ON "news_blocks_image" USING btree ("image_id");
  CREATE UNIQUE INDEX "news_slug_idx" ON "news" USING btree ("slug");
  CREATE INDEX "news_date_idx" ON "news" USING btree ("date");
  CREATE INDEX "news_main_image_idx" ON "news" USING btree ("main_image_id");
  CREATE INDEX "news_updated_at_idx" ON "news" USING btree ("updated_at");
  CREATE INDEX "news_created_at_idx" ON "news" USING btree ("created_at");
  CREATE INDEX "news__status_idx" ON "news" USING btree ("_status");
  CREATE INDEX "_news_v_blocks_heading_order_idx" ON "_news_v_blocks_heading" USING btree ("_order");
  CREATE INDEX "_news_v_blocks_heading_parent_id_idx" ON "_news_v_blocks_heading" USING btree ("_parent_id");
  CREATE INDEX "_news_v_blocks_heading_path_idx" ON "_news_v_blocks_heading" USING btree ("_path");
  CREATE INDEX "_news_v_blocks_paragraph_order_idx" ON "_news_v_blocks_paragraph" USING btree ("_order");
  CREATE INDEX "_news_v_blocks_paragraph_parent_id_idx" ON "_news_v_blocks_paragraph" USING btree ("_parent_id");
  CREATE INDEX "_news_v_blocks_paragraph_path_idx" ON "_news_v_blocks_paragraph" USING btree ("_path");
  CREATE INDEX "_news_v_blocks_image_order_idx" ON "_news_v_blocks_image" USING btree ("_order");
  CREATE INDEX "_news_v_blocks_image_parent_id_idx" ON "_news_v_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "_news_v_blocks_image_path_idx" ON "_news_v_blocks_image" USING btree ("_path");
  CREATE INDEX "_news_v_blocks_image_image_idx" ON "_news_v_blocks_image" USING btree ("image_id");
  CREATE INDEX "_news_v_parent_idx" ON "_news_v" USING btree ("parent_id");
  CREATE INDEX "_news_v_version_version_slug_idx" ON "_news_v" USING btree ("version_slug");
  CREATE INDEX "_news_v_version_version_date_idx" ON "_news_v" USING btree ("version_date");
  CREATE INDEX "_news_v_version_version_main_image_idx" ON "_news_v" USING btree ("version_main_image_id");
  CREATE INDEX "_news_v_version_version_updated_at_idx" ON "_news_v" USING btree ("version_updated_at");
  CREATE INDEX "_news_v_version_version_created_at_idx" ON "_news_v" USING btree ("version_created_at");
  CREATE INDEX "_news_v_version_version__status_idx" ON "_news_v" USING btree ("version__status");
  CREATE INDEX "_news_v_created_at_idx" ON "_news_v" USING btree ("created_at");
  CREATE INDEX "_news_v_updated_at_idx" ON "_news_v" USING btree ("updated_at");
  CREATE INDEX "_news_v_latest_idx" ON "_news_v" USING btree ("latest");
  CREATE INDEX "_news_v_autosave_idx" ON "_news_v" USING btree ("autosave");
  CREATE INDEX "faq_blocks_paragraph_order_idx" ON "faq_blocks_paragraph" USING btree ("_order");
  CREATE INDEX "faq_blocks_paragraph_parent_id_idx" ON "faq_blocks_paragraph" USING btree ("_parent_id");
  CREATE INDEX "faq_blocks_paragraph_path_idx" ON "faq_blocks_paragraph" USING btree ("_path");
  CREATE INDEX "faq_faq_items_order_idx" ON "faq_faq_items" USING btree ("_order");
  CREATE INDEX "faq_faq_items_parent_id_idx" ON "faq_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "faq_slug_idx" ON "faq" USING btree ("slug");
  CREATE INDEX "faq_updated_at_idx" ON "faq" USING btree ("updated_at");
  CREATE INDEX "faq_created_at_idx" ON "faq" USING btree ("created_at");
  CREATE INDEX "faq__status_idx" ON "faq" USING btree ("_status");
  CREATE INDEX "_faq_v_blocks_paragraph_order_idx" ON "_faq_v_blocks_paragraph" USING btree ("_order");
  CREATE INDEX "_faq_v_blocks_paragraph_parent_id_idx" ON "_faq_v_blocks_paragraph" USING btree ("_parent_id");
  CREATE INDEX "_faq_v_blocks_paragraph_path_idx" ON "_faq_v_blocks_paragraph" USING btree ("_path");
  CREATE INDEX "_faq_v_version_faq_items_order_idx" ON "_faq_v_version_faq_items" USING btree ("_order");
  CREATE INDEX "_faq_v_version_faq_items_parent_id_idx" ON "_faq_v_version_faq_items" USING btree ("_parent_id");
  CREATE INDEX "_faq_v_parent_idx" ON "_faq_v" USING btree ("parent_id");
  CREATE INDEX "_faq_v_version_version_slug_idx" ON "_faq_v" USING btree ("version_slug");
  CREATE INDEX "_faq_v_version_version_updated_at_idx" ON "_faq_v" USING btree ("version_updated_at");
  CREATE INDEX "_faq_v_version_version_created_at_idx" ON "_faq_v" USING btree ("version_created_at");
  CREATE INDEX "_faq_v_version_version__status_idx" ON "_faq_v" USING btree ("version__status");
  CREATE INDEX "_faq_v_created_at_idx" ON "_faq_v" USING btree ("created_at");
  CREATE INDEX "_faq_v_updated_at_idx" ON "_faq_v" USING btree ("updated_at");
  CREATE INDEX "_faq_v_latest_idx" ON "_faq_v" USING btree ("latest");
  CREATE INDEX "_faq_v_autosave_idx" ON "_faq_v" USING btree ("autosave");
  CREATE INDEX "bookings_house_idx" ON "bookings" USING btree ("house_id");
  CREATE INDEX "bookings_check_in_idx" ON "bookings" USING btree ("check_in");
  CREATE INDEX "bookings_check_out_idx" ON "bookings" USING btree ("check_out");
  CREATE INDEX "bookings_is_confirmed_idx" ON "bookings" USING btree ("is_confirmed");
  CREATE INDEX "bookings_updated_at_idx" ON "bookings" USING btree ("updated_at");
  CREATE INDEX "bookings_created_at_idx" ON "bookings" USING btree ("created_at");
  CREATE INDEX "event_rsvps_event_idx" ON "event_rsvps" USING btree ("event_id");
  CREATE INDEX "event_rsvps_status_idx" ON "event_rsvps" USING btree ("status");
  CREATE UNIQUE INDEX "event_rsvps_secret_key_idx" ON "event_rsvps" USING btree ("secret_key");
  CREATE INDEX "event_rsvps_user_idx" ON "event_rsvps" USING btree ("user_id");
  CREATE INDEX "event_rsvps_updated_at_idx" ON "event_rsvps" USING btree ("updated_at");
  CREATE INDEX "event_rsvps_created_at_idx" ON "event_rsvps" USING btree ("created_at");
  CREATE INDEX "event_drivers_event_idx" ON "event_drivers" USING btree ("event_id");
  CREATE INDEX "event_drivers_departure_date_idx" ON "event_drivers" USING btree ("departure_date");
  CREATE UNIQUE INDEX "event_drivers_cancel_token_idx" ON "event_drivers" USING btree ("cancel_token");
  CREATE INDEX "event_drivers_updated_at_idx" ON "event_drivers" USING btree ("updated_at");
  CREATE INDEX "event_drivers_created_at_idx" ON "event_drivers" USING btree ("created_at");
  CREATE INDEX "ride_passengers_driver_idx" ON "ride_passengers" USING btree ("driver_id");
  CREATE INDEX "ride_passengers_status_idx" ON "ride_passengers" USING btree ("status");
  CREATE INDEX "ride_passengers_updated_at_idx" ON "ride_passengers" USING btree ("updated_at");
  CREATE INDEX "ride_passengers_created_at_idx" ON "ride_passengers" USING btree ("created_at");
  CREATE INDEX "carpool_requests_event_idx" ON "carpool_requests" USING btree ("event_id");
  CREATE INDEX "carpool_requests_is_active_idx" ON "carpool_requests" USING btree ("is_active");
  CREATE INDEX "carpool_requests_updated_at_idx" ON "carpool_requests" USING btree ("updated_at");
  CREATE INDEX "carpool_requests_created_at_idx" ON "carpool_requests" USING btree ("created_at");
  CREATE INDEX "taxi_pools_event_idx" ON "taxi_pools" USING btree ("event_id");
  CREATE INDEX "taxi_pools_departure_date_idx" ON "taxi_pools" USING btree ("departure_date");
  CREATE INDEX "taxi_pools_is_active_idx" ON "taxi_pools" USING btree ("is_active");
  CREATE INDEX "taxi_pools_updated_at_idx" ON "taxi_pools" USING btree ("updated_at");
  CREATE INDEX "taxi_pools_created_at_idx" ON "taxi_pools" USING btree ("created_at");
  CREATE INDEX "taxi_passengers_taxi_idx" ON "taxi_passengers" USING btree ("taxi_id");
  CREATE INDEX "taxi_passengers_is_active_idx" ON "taxi_passengers" USING btree ("is_active");
  CREATE INDEX "taxi_passengers_updated_at_idx" ON "taxi_passengers" USING btree ("updated_at");
  CREATE INDEX "taxi_passengers_created_at_idx" ON "taxi_passengers" USING btree ("created_at");
  CREATE UNIQUE INDEX "newsletter_signups_email_idx" ON "newsletter_signups" USING btree ("email");
  CREATE INDEX "newsletter_signups_is_active_idx" ON "newsletter_signups" USING btree ("is_active");
  CREATE INDEX "newsletter_signups_updated_at_idx" ON "newsletter_signups" USING btree ("updated_at");
  CREATE INDEX "newsletter_signups_created_at_idx" ON "newsletter_signups" USING btree ("created_at");
  CREATE UNIQUE INDEX "extra_services_slug_idx" ON "extra_services" USING btree ("slug");
  CREATE INDEX "extra_services_is_active_idx" ON "extra_services" USING btree ("is_active");
  CREATE INDEX "extra_services_order_idx" ON "extra_services" USING btree ("order");
  CREATE INDEX "extra_services_updated_at_idx" ON "extra_services" USING btree ("updated_at");
  CREATE INDEX "extra_services_created_at_idx" ON "extra_services" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_houses_id_idx" ON "payload_locked_documents_rels" USING btree ("houses_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_news_id_idx" ON "payload_locked_documents_rels" USING btree ("news_id");
  CREATE INDEX "payload_locked_documents_rels_faq_id_idx" ON "payload_locked_documents_rels" USING btree ("faq_id");
  CREATE INDEX "payload_locked_documents_rels_bookings_id_idx" ON "payload_locked_documents_rels" USING btree ("bookings_id");
  CREATE INDEX "payload_locked_documents_rels_event_rsvps_id_idx" ON "payload_locked_documents_rels" USING btree ("event_rsvps_id");
  CREATE INDEX "payload_locked_documents_rels_event_drivers_id_idx" ON "payload_locked_documents_rels" USING btree ("event_drivers_id");
  CREATE INDEX "payload_locked_documents_rels_ride_passengers_id_idx" ON "payload_locked_documents_rels" USING btree ("ride_passengers_id");
  CREATE INDEX "payload_locked_documents_rels_carpool_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("carpool_requests_id");
  CREATE INDEX "payload_locked_documents_rels_taxi_pools_id_idx" ON "payload_locked_documents_rels" USING btree ("taxi_pools_id");
  CREATE INDEX "payload_locked_documents_rels_taxi_passengers_id_idx" ON "payload_locked_documents_rels" USING btree ("taxi_passengers_id");
  CREATE INDEX "payload_locked_documents_rels_newsletter_signups_id_idx" ON "payload_locked_documents_rels" USING btree ("newsletter_signups_id");
  CREATE INDEX "payload_locked_documents_rels_extra_services_id_idx" ON "payload_locked_documents_rels" USING btree ("extra_services_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "site_settings_social_links_order_idx" ON "site_settings_social_links" USING btree ("_order");
  CREATE INDEX "site_settings_social_links_parent_id_idx" ON "site_settings_social_links" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "houses_blocks_heading" CASCADE;
  DROP TABLE "houses_blocks_paragraph" CASCADE;
  DROP TABLE "houses_blocks_image" CASCADE;
  DROP TABLE "houses" CASCADE;
  DROP TABLE "_houses_v_blocks_heading" CASCADE;
  DROP TABLE "_houses_v_blocks_paragraph" CASCADE;
  DROP TABLE "_houses_v_blocks_image" CASCADE;
  DROP TABLE "_houses_v" CASCADE;
  DROP TABLE "events_blocks_heading" CASCADE;
  DROP TABLE "events_blocks_paragraph" CASCADE;
  DROP TABLE "events_blocks_image" CASCADE;
  DROP TABLE "events_blocks_info_card" CASCADE;
  DROP TABLE "events_blocks_faq_item" CASCADE;
  DROP TABLE "events_blocks_cta_card" CASCADE;
  DROP TABLE "events_blocks_amenity_item" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "_events_v_blocks_heading" CASCADE;
  DROP TABLE "_events_v_blocks_paragraph" CASCADE;
  DROP TABLE "_events_v_blocks_image" CASCADE;
  DROP TABLE "_events_v_blocks_info_card" CASCADE;
  DROP TABLE "_events_v_blocks_faq_item" CASCADE;
  DROP TABLE "_events_v_blocks_cta_card" CASCADE;
  DROP TABLE "_events_v_blocks_amenity_item" CASCADE;
  DROP TABLE "_events_v" CASCADE;
  DROP TABLE "news_blocks_heading" CASCADE;
  DROP TABLE "news_blocks_paragraph" CASCADE;
  DROP TABLE "news_blocks_image" CASCADE;
  DROP TABLE "news" CASCADE;
  DROP TABLE "_news_v_blocks_heading" CASCADE;
  DROP TABLE "_news_v_blocks_paragraph" CASCADE;
  DROP TABLE "_news_v_blocks_image" CASCADE;
  DROP TABLE "_news_v" CASCADE;
  DROP TABLE "faq_blocks_paragraph" CASCADE;
  DROP TABLE "faq_faq_items" CASCADE;
  DROP TABLE "faq" CASCADE;
  DROP TABLE "_faq_v_blocks_paragraph" CASCADE;
  DROP TABLE "_faq_v_version_faq_items" CASCADE;
  DROP TABLE "_faq_v" CASCADE;
  DROP TABLE "bookings" CASCADE;
  DROP TABLE "event_rsvps" CASCADE;
  DROP TABLE "event_drivers" CASCADE;
  DROP TABLE "ride_passengers" CASCADE;
  DROP TABLE "carpool_requests" CASCADE;
  DROP TABLE "taxi_pools" CASCADE;
  DROP TABLE "taxi_passengers" CASCADE;
  DROP TABLE "newsletter_signups" CASCADE;
  DROP TABLE "extra_services" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings_social_links" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_houses_blocks_heading_level";
  DROP TYPE "public"."enum_houses_status";
  DROP TYPE "public"."enum__houses_v_blocks_heading_level";
  DROP TYPE "public"."enum__houses_v_version_status";
  DROP TYPE "public"."enum_events_blocks_heading_level";
  DROP TYPE "public"."enum_events_status";
  DROP TYPE "public"."enum__events_v_blocks_heading_level";
  DROP TYPE "public"."enum__events_v_version_status";
  DROP TYPE "public"."enum_news_blocks_heading_level";
  DROP TYPE "public"."enum_news_status";
  DROP TYPE "public"."enum__news_v_blocks_heading_level";
  DROP TYPE "public"."enum__news_v_version_status";
  DROP TYPE "public"."enum_faq_status";
  DROP TYPE "public"."enum__faq_v_version_status";
  DROP TYPE "public"."enum_event_rsvps_status";
  DROP TYPE "public"."enum_event_drivers_contact_preference";
  DROP TYPE "public"."enum_ride_passengers_status";
  DROP TYPE "public"."enum_taxi_pools_service";`)
}
