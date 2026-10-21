import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_hero_buttons_kind" AS ENUM('route', 'page', 'url');
  CREATE TYPE "public"."enum_pages_blocks_hero_buttons_route" AS ENUM('/', '/about', '/projects', '/news', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  CREATE TYPE "public"."enum_pages_blocks_text_surface" AS ENUM('canvas', 'sky');
  CREATE TYPE "public"."enum_pages_blocks_cards_items_buttons_kind" AS ENUM('route', 'page', 'url');
  CREATE TYPE "public"."enum_pages_blocks_cards_items_buttons_route" AS ENUM('/', '/about', '/projects', '/news', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  CREATE TYPE "public"."enum_pages_blocks_cards_items_icon" AS ENUM('youth', 'peace', 'integration', 'entrepreneurship', 'education', 'community');
  CREATE TYPE "public"."enum_pages_blocks_image_text_image_position" AS ENUM('start', 'end');
  CREATE TYPE "public"."enum_pages_blocks_night_band_buttons_kind" AS ENUM('route', 'page', 'url');
  CREATE TYPE "public"."enum_pages_blocks_night_band_buttons_route" AS ENUM('/', '/about', '/projects', '/news', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  CREATE TYPE "public"."enum_pages_blocks_call_to_action_buttons_kind" AS ENUM('route', 'page', 'url');
  CREATE TYPE "public"."enum_pages_blocks_call_to_action_buttons_route" AS ENUM('/', '/about', '/projects', '/news', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  CREATE TYPE "public"."enum_pages_blocks_news_count" AS ENUM('3', '6');
  CREATE TYPE "public"."enum_pages_blocks_focus_areas_variant" AS ENUM('names', 'details');
  CREATE TYPE "public"."enum_pages_system_key" AS ENUM('home', 'about', 'membership', 'support', 'contact');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_buttons_kind" AS ENUM('route', 'page', 'url');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_buttons_route" AS ENUM('/', '/about', '/projects', '/news', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  CREATE TYPE "public"."enum__pages_v_blocks_text_surface" AS ENUM('canvas', 'sky');
  CREATE TYPE "public"."enum__pages_v_blocks_cards_items_buttons_kind" AS ENUM('route', 'page', 'url');
  CREATE TYPE "public"."enum__pages_v_blocks_cards_items_buttons_route" AS ENUM('/', '/about', '/projects', '/news', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  CREATE TYPE "public"."enum__pages_v_blocks_cards_items_icon" AS ENUM('youth', 'peace', 'integration', 'entrepreneurship', 'education', 'community');
  CREATE TYPE "public"."enum__pages_v_blocks_image_text_image_position" AS ENUM('start', 'end');
  CREATE TYPE "public"."enum__pages_v_blocks_night_band_buttons_kind" AS ENUM('route', 'page', 'url');
  CREATE TYPE "public"."enum__pages_v_blocks_night_band_buttons_route" AS ENUM('/', '/about', '/projects', '/news', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  CREATE TYPE "public"."enum__pages_v_blocks_call_to_action_buttons_kind" AS ENUM('route', 'page', 'url');
  CREATE TYPE "public"."enum__pages_v_blocks_call_to_action_buttons_route" AS ENUM('/', '/about', '/projects', '/news', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  CREATE TYPE "public"."enum__pages_v_blocks_news_count" AS ENUM('3', '6');
  CREATE TYPE "public"."enum__pages_v_blocks_focus_areas_variant" AS ENUM('names', 'details');
  CREATE TYPE "public"."enum__pages_v_version_system_key" AS ENUM('home', 'about', 'membership', 'support', 'contact');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_published_locale" AS ENUM('de', 'en', 'ar');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'schedulePublish';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'schedulePublish';
  CREATE TABLE "pages_blocks_header" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"show_tagline" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_header_locales" (
  	"title" varchar,
  	"lead" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_hero_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_pages_blocks_hero_buttons_kind" DEFAULT 'route',
  	"route" "enum_pages_blocks_hero_buttons_route",
  	"page_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "pages_blocks_hero_buttons_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"show_tagline" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_hero_locales" (
  	"headline" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_media_header" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_media_header_locales" (
  	"title" varchar,
  	"lead" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"surface" "enum_pages_blocks_text_surface" DEFAULT 'canvas',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_text_locales" (
  	"heading" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_cards_items_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_pages_blocks_cards_items_buttons_kind" DEFAULT 'route',
  	"route" "enum_pages_blocks_cards_items_buttons_route",
  	"page_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "pages_blocks_cards_items_buttons_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_cards_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_pages_blocks_cards_items_icon"
  );
  
  CREATE TABLE "pages_blocks_cards_items_locales" (
  	"heading" varchar,
  	"text" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"numbered" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_cards_locales" (
  	"heading" varchar,
  	"intro" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_image_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"image_position" "enum_pages_blocks_image_text_image_position" DEFAULT 'start',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_image_text_locales" (
  	"heading" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_statement" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_statement_locales" (
  	"statement" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_quote" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_quote_locales" (
  	"quote" varchar,
  	"attribution" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_gallery_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_timeline_entries" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"year" numeric
  );
  
  CREATE TABLE "pages_blocks_timeline_entries_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_timeline" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_timeline_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_values_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_values_items_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_values_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_journey" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_journey_locales" (
  	"from" varchar,
  	"to" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_night_band_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_pages_blocks_night_band_buttons_kind" DEFAULT 'route',
  	"route" "enum_pages_blocks_night_band_buttons_route",
  	"page_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "pages_blocks_night_band_buttons_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_night_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_night_band_locales" (
  	"heading" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_call_to_action_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_pages_blocks_call_to_action_buttons_kind" DEFAULT 'route',
  	"route" "enum_pages_blocks_call_to_action_buttons_route",
  	"page_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "pages_blocks_call_to_action_buttons_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_call_to_action_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_donation" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"account_holder" varchar,
  	"bank_name" varchar,
  	"iban" varchar,
  	"bic" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_donation_locales" (
  	"heading" varchar,
  	"body" jsonb,
  	"reference" varchar,
  	"tax_status_note" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_projects" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_projects_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_news" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"count" "enum_pages_blocks_news_count" DEFAULT '3',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_news_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_focus_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_focus_areas_variant" DEFAULT 'names',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_focus_areas_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_stats_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_board" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_board_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_partners" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_partners_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_membership_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_membership_form_locales" (
  	"heading" varchar,
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_contact_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"show_email" boolean DEFAULT true,
  	"show_phone" boolean DEFAULT false,
  	"show_address" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_contact_form_locales" (
  	"intro" jsonb,
  	"office_hours" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"system_key" "enum_pages_system_key",
  	"published_at" timestamp(3) with time zone,
  	"seo_og_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "pages_locales" (
  	"title" varchar,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "_pages_v_blocks_header" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"show_tagline" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_header_locales" (
  	"title" varchar,
  	"lead" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_hero_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum__pages_v_blocks_hero_buttons_kind" DEFAULT 'route',
  	"route" "enum__pages_v_blocks_hero_buttons_route",
  	"page_id" integer,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero_buttons_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"show_tagline" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero_locales" (
  	"headline" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_media_header" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_media_header_locales" (
  	"title" varchar,
  	"lead" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"surface" "enum__pages_v_blocks_text_surface" DEFAULT 'canvas',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_text_locales" (
  	"heading" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_cards_items_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum__pages_v_blocks_cards_items_buttons_kind" DEFAULT 'route',
  	"route" "enum__pages_v_blocks_cards_items_buttons_route",
  	"page_id" integer,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cards_items_buttons_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_cards_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" "enum__pages_v_blocks_cards_items_icon",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cards_items_locales" (
  	"heading" varchar,
  	"text" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"numbered" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cards_locales" (
  	"heading" varchar,
  	"intro" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_image_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"image_position" "enum__pages_v_blocks_image_text_image_position" DEFAULT 'start',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_image_text_locales" (
  	"heading" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_statement" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_statement_locales" (
  	"statement" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_quote" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_quote_locales" (
  	"quote" varchar,
  	"attribution" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_gallery_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_timeline_entries" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"year" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_timeline_entries_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_timeline" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_timeline_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_values_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_values_items_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_values_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_journey" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_journey_locales" (
  	"from" varchar,
  	"to" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_night_band_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum__pages_v_blocks_night_band_buttons_kind" DEFAULT 'route',
  	"route" "enum__pages_v_blocks_night_band_buttons_route",
  	"page_id" integer,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_night_band_buttons_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_night_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_night_band_locales" (
  	"heading" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_call_to_action_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum__pages_v_blocks_call_to_action_buttons_kind" DEFAULT 'route',
  	"route" "enum__pages_v_blocks_call_to_action_buttons_route",
  	"page_id" integer,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_call_to_action_buttons_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_call_to_action_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_donation" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"account_holder" varchar,
  	"bank_name" varchar,
  	"iban" varchar,
  	"bic" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_donation_locales" (
  	"heading" varchar,
  	"body" jsonb,
  	"reference" varchar,
  	"tax_status_note" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_projects" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_projects_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_news" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"count" "enum__pages_v_blocks_news_count" DEFAULT '3',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_news_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_focus_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_focus_areas_variant" DEFAULT 'names',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_focus_areas_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_stats_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_board" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_board_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_partners" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_partners_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_membership_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_membership_form_locales" (
  	"heading" varchar,
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_contact_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"show_email" boolean DEFAULT true,
  	"show_phone" boolean DEFAULT false,
  	"show_address" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_contact_form_locales" (
  	"intro" jsonb,
  	"office_hours" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_system_key" "enum__pages_v_version_system_key",
  	"version_published_at" timestamp(3) with time zone,
  	"version_seo_og_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__pages_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_pages_v_locales" (
  	"version_title" varchar,
  	"version_seo_meta_title" varchar,
  	"version_seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "form_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "form_texts_locales" (
  	"membership_principles" varchar,
  	"membership_fees" varchar,
  	"membership_guardian" varchar,
  	"membership_consent" varchar,
  	"contact_consent" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_form_texts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_form_texts_v_locales" (
  	"version_membership_principles" varchar,
  	"version_membership_fees" varchar,
  	"version_membership_guardian" varchar,
  	"version_membership_consent" varchar,
  	"version_contact_consent" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pages_id" integer;
  ALTER TABLE "pages_blocks_header" ADD CONSTRAINT "pages_blocks_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_header_locales" ADD CONSTRAINT "pages_blocks_header_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_buttons" ADD CONSTRAINT "pages_blocks_hero_buttons_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_buttons" ADD CONSTRAINT "pages_blocks_hero_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_buttons_locales" ADD CONSTRAINT "pages_blocks_hero_buttons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero_buttons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_locales" ADD CONSTRAINT "pages_blocks_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_media_header" ADD CONSTRAINT "pages_blocks_media_header_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_media_header" ADD CONSTRAINT "pages_blocks_media_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_media_header_locales" ADD CONSTRAINT "pages_blocks_media_header_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_media_header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_text" ADD CONSTRAINT "pages_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_text_locales" ADD CONSTRAINT "pages_blocks_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards_items_buttons" ADD CONSTRAINT "pages_blocks_cards_items_buttons_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards_items_buttons" ADD CONSTRAINT "pages_blocks_cards_items_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cards_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards_items_buttons_locales" ADD CONSTRAINT "pages_blocks_cards_items_buttons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cards_items_buttons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards_items" ADD CONSTRAINT "pages_blocks_cards_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards_items_locales" ADD CONSTRAINT "pages_blocks_cards_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cards_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards" ADD CONSTRAINT "pages_blocks_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards_locales" ADD CONSTRAINT "pages_blocks_cards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_image_text" ADD CONSTRAINT "pages_blocks_image_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_image_text" ADD CONSTRAINT "pages_blocks_image_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_image_text_locales" ADD CONSTRAINT "pages_blocks_image_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_image_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_statement" ADD CONSTRAINT "pages_blocks_statement_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_statement_locales" ADD CONSTRAINT "pages_blocks_statement_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_statement"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_quote" ADD CONSTRAINT "pages_blocks_quote_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_quote_locales" ADD CONSTRAINT "pages_blocks_quote_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_quote"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_items" ADD CONSTRAINT "pages_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_items_locales" ADD CONSTRAINT "pages_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq" ADD CONSTRAINT "pages_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_locales" ADD CONSTRAINT "pages_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_gallery" ADD CONSTRAINT "pages_blocks_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_gallery_locales" ADD CONSTRAINT "pages_blocks_gallery_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_timeline_entries" ADD CONSTRAINT "pages_blocks_timeline_entries_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_timeline"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_timeline_entries_locales" ADD CONSTRAINT "pages_blocks_timeline_entries_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_timeline_entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_timeline" ADD CONSTRAINT "pages_blocks_timeline_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_timeline_locales" ADD CONSTRAINT "pages_blocks_timeline_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_timeline"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_values_items" ADD CONSTRAINT "pages_blocks_values_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_values"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_values_items_locales" ADD CONSTRAINT "pages_blocks_values_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_values_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_values" ADD CONSTRAINT "pages_blocks_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_values_locales" ADD CONSTRAINT "pages_blocks_values_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_values"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_journey" ADD CONSTRAINT "pages_blocks_journey_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_journey_locales" ADD CONSTRAINT "pages_blocks_journey_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_journey"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_night_band_buttons" ADD CONSTRAINT "pages_blocks_night_band_buttons_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_night_band_buttons" ADD CONSTRAINT "pages_blocks_night_band_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_night_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_night_band_buttons_locales" ADD CONSTRAINT "pages_blocks_night_band_buttons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_night_band_buttons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_night_band" ADD CONSTRAINT "pages_blocks_night_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_night_band_locales" ADD CONSTRAINT "pages_blocks_night_band_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_night_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_call_to_action_buttons" ADD CONSTRAINT "pages_blocks_call_to_action_buttons_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_call_to_action_buttons" ADD CONSTRAINT "pages_blocks_call_to_action_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_call_to_action"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_call_to_action_buttons_locales" ADD CONSTRAINT "pages_blocks_call_to_action_buttons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_call_to_action_buttons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_call_to_action" ADD CONSTRAINT "pages_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_call_to_action_locales" ADD CONSTRAINT "pages_blocks_call_to_action_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_call_to_action"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_donation" ADD CONSTRAINT "pages_blocks_donation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_donation_locales" ADD CONSTRAINT "pages_blocks_donation_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_donation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_projects" ADD CONSTRAINT "pages_blocks_projects_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_projects_locales" ADD CONSTRAINT "pages_blocks_projects_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_news" ADD CONSTRAINT "pages_blocks_news_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_news_locales" ADD CONSTRAINT "pages_blocks_news_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_focus_areas" ADD CONSTRAINT "pages_blocks_focus_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_focus_areas_locales" ADD CONSTRAINT "pages_blocks_focus_areas_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_focus_areas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_stats" ADD CONSTRAINT "pages_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_stats_locales" ADD CONSTRAINT "pages_blocks_stats_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_board" ADD CONSTRAINT "pages_blocks_board_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_board_locales" ADD CONSTRAINT "pages_blocks_board_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_board"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_partners" ADD CONSTRAINT "pages_blocks_partners_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_partners_locales" ADD CONSTRAINT "pages_blocks_partners_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_membership_form" ADD CONSTRAINT "pages_blocks_membership_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_membership_form_locales" ADD CONSTRAINT "pages_blocks_membership_form_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_membership_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_contact_form" ADD CONSTRAINT "pages_blocks_contact_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_contact_form_locales" ADD CONSTRAINT "pages_blocks_contact_form_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_contact_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_header" ADD CONSTRAINT "_pages_v_blocks_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_header_locales" ADD CONSTRAINT "_pages_v_blocks_header_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_buttons" ADD CONSTRAINT "_pages_v_blocks_hero_buttons_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_buttons" ADD CONSTRAINT "_pages_v_blocks_hero_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_buttons_locales" ADD CONSTRAINT "_pages_v_blocks_hero_buttons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero_buttons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_locales" ADD CONSTRAINT "_pages_v_blocks_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_media_header" ADD CONSTRAINT "_pages_v_blocks_media_header_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_media_header" ADD CONSTRAINT "_pages_v_blocks_media_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_media_header_locales" ADD CONSTRAINT "_pages_v_blocks_media_header_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_media_header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_text" ADD CONSTRAINT "_pages_v_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_text_locales" ADD CONSTRAINT "_pages_v_blocks_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards_items_buttons" ADD CONSTRAINT "_pages_v_blocks_cards_items_buttons_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards_items_buttons" ADD CONSTRAINT "_pages_v_blocks_cards_items_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cards_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards_items_buttons_locales" ADD CONSTRAINT "_pages_v_blocks_cards_items_buttons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cards_items_buttons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards_items" ADD CONSTRAINT "_pages_v_blocks_cards_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards_items_locales" ADD CONSTRAINT "_pages_v_blocks_cards_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cards_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards" ADD CONSTRAINT "_pages_v_blocks_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards_locales" ADD CONSTRAINT "_pages_v_blocks_cards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image_text" ADD CONSTRAINT "_pages_v_blocks_image_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image_text" ADD CONSTRAINT "_pages_v_blocks_image_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image_text_locales" ADD CONSTRAINT "_pages_v_blocks_image_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_image_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_statement" ADD CONSTRAINT "_pages_v_blocks_statement_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_statement_locales" ADD CONSTRAINT "_pages_v_blocks_statement_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_statement"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_quote" ADD CONSTRAINT "_pages_v_blocks_quote_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_quote_locales" ADD CONSTRAINT "_pages_v_blocks_quote_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_quote"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_items" ADD CONSTRAINT "_pages_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_items_locales" ADD CONSTRAINT "_pages_v_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq" ADD CONSTRAINT "_pages_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_locales" ADD CONSTRAINT "_pages_v_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_gallery" ADD CONSTRAINT "_pages_v_blocks_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_gallery_locales" ADD CONSTRAINT "_pages_v_blocks_gallery_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_timeline_entries" ADD CONSTRAINT "_pages_v_blocks_timeline_entries_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_timeline"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_timeline_entries_locales" ADD CONSTRAINT "_pages_v_blocks_timeline_entries_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_timeline_entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_timeline" ADD CONSTRAINT "_pages_v_blocks_timeline_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_timeline_locales" ADD CONSTRAINT "_pages_v_blocks_timeline_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_timeline"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_values_items" ADD CONSTRAINT "_pages_v_blocks_values_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_values"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_values_items_locales" ADD CONSTRAINT "_pages_v_blocks_values_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_values_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_values" ADD CONSTRAINT "_pages_v_blocks_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_values_locales" ADD CONSTRAINT "_pages_v_blocks_values_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_values"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_journey" ADD CONSTRAINT "_pages_v_blocks_journey_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_journey_locales" ADD CONSTRAINT "_pages_v_blocks_journey_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_journey"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_night_band_buttons" ADD CONSTRAINT "_pages_v_blocks_night_band_buttons_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_night_band_buttons" ADD CONSTRAINT "_pages_v_blocks_night_band_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_night_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_night_band_buttons_locales" ADD CONSTRAINT "_pages_v_blocks_night_band_buttons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_night_band_buttons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_night_band" ADD CONSTRAINT "_pages_v_blocks_night_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_night_band_locales" ADD CONSTRAINT "_pages_v_blocks_night_band_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_night_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_call_to_action_buttons" ADD CONSTRAINT "_pages_v_blocks_call_to_action_buttons_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_call_to_action_buttons" ADD CONSTRAINT "_pages_v_blocks_call_to_action_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_call_to_action"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_call_to_action_buttons_locales" ADD CONSTRAINT "_pages_v_blocks_call_to_action_buttons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_call_to_action_buttons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_call_to_action" ADD CONSTRAINT "_pages_v_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_call_to_action_locales" ADD CONSTRAINT "_pages_v_blocks_call_to_action_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_call_to_action"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_donation" ADD CONSTRAINT "_pages_v_blocks_donation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_donation_locales" ADD CONSTRAINT "_pages_v_blocks_donation_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_donation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_projects" ADD CONSTRAINT "_pages_v_blocks_projects_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_projects_locales" ADD CONSTRAINT "_pages_v_blocks_projects_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_news" ADD CONSTRAINT "_pages_v_blocks_news_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_news_locales" ADD CONSTRAINT "_pages_v_blocks_news_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_focus_areas" ADD CONSTRAINT "_pages_v_blocks_focus_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_focus_areas_locales" ADD CONSTRAINT "_pages_v_blocks_focus_areas_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_focus_areas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_stats" ADD CONSTRAINT "_pages_v_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_stats_locales" ADD CONSTRAINT "_pages_v_blocks_stats_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_board" ADD CONSTRAINT "_pages_v_blocks_board_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_board_locales" ADD CONSTRAINT "_pages_v_blocks_board_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_board"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_partners" ADD CONSTRAINT "_pages_v_blocks_partners_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_partners_locales" ADD CONSTRAINT "_pages_v_blocks_partners_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_membership_form" ADD CONSTRAINT "_pages_v_blocks_membership_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_membership_form_locales" ADD CONSTRAINT "_pages_v_blocks_membership_form_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_membership_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_contact_form" ADD CONSTRAINT "_pages_v_blocks_contact_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_contact_form_locales" ADD CONSTRAINT "_pages_v_blocks_contact_form_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_contact_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "form_texts_locales" ADD CONSTRAINT "form_texts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."form_texts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_form_texts_v_locales" ADD CONSTRAINT "_form_texts_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_form_texts_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_header_order_idx" ON "pages_blocks_header" USING btree ("_order");
  CREATE INDEX "pages_blocks_header_parent_id_idx" ON "pages_blocks_header" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_header_path_idx" ON "pages_blocks_header" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_header_locales_locale_parent_id_unique" ON "pages_blocks_header_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_hero_buttons_order_idx" ON "pages_blocks_hero_buttons" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_buttons_parent_id_idx" ON "pages_blocks_hero_buttons" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_buttons_page_idx" ON "pages_blocks_hero_buttons" USING btree ("page_id");
  CREATE UNIQUE INDEX "pages_blocks_hero_buttons_locales_locale_parent_id_unique" ON "pages_blocks_hero_buttons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_hero_order_idx" ON "pages_blocks_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_parent_id_idx" ON "pages_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_path_idx" ON "pages_blocks_hero" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_hero_locales_locale_parent_id_unique" ON "pages_blocks_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_media_header_order_idx" ON "pages_blocks_media_header" USING btree ("_order");
  CREATE INDEX "pages_blocks_media_header_parent_id_idx" ON "pages_blocks_media_header" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_media_header_path_idx" ON "pages_blocks_media_header" USING btree ("_path");
  CREATE INDEX "pages_blocks_media_header_image_idx" ON "pages_blocks_media_header" USING btree ("image_id");
  CREATE UNIQUE INDEX "pages_blocks_media_header_locales_locale_parent_id_unique" ON "pages_blocks_media_header_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_text_order_idx" ON "pages_blocks_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_text_parent_id_idx" ON "pages_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_text_path_idx" ON "pages_blocks_text" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_text_locales_locale_parent_id_unique" ON "pages_blocks_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_cards_items_buttons_order_idx" ON "pages_blocks_cards_items_buttons" USING btree ("_order");
  CREATE INDEX "pages_blocks_cards_items_buttons_parent_id_idx" ON "pages_blocks_cards_items_buttons" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cards_items_buttons_page_idx" ON "pages_blocks_cards_items_buttons" USING btree ("page_id");
  CREATE UNIQUE INDEX "pages_blocks_cards_items_buttons_locales_locale_parent_id_un" ON "pages_blocks_cards_items_buttons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_cards_items_order_idx" ON "pages_blocks_cards_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_cards_items_parent_id_idx" ON "pages_blocks_cards_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_cards_items_locales_locale_parent_id_unique" ON "pages_blocks_cards_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_cards_order_idx" ON "pages_blocks_cards" USING btree ("_order");
  CREATE INDEX "pages_blocks_cards_parent_id_idx" ON "pages_blocks_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cards_path_idx" ON "pages_blocks_cards" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_cards_locales_locale_parent_id_unique" ON "pages_blocks_cards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_image_text_order_idx" ON "pages_blocks_image_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_image_text_parent_id_idx" ON "pages_blocks_image_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_image_text_path_idx" ON "pages_blocks_image_text" USING btree ("_path");
  CREATE INDEX "pages_blocks_image_text_image_idx" ON "pages_blocks_image_text" USING btree ("image_id");
  CREATE UNIQUE INDEX "pages_blocks_image_text_locales_locale_parent_id_unique" ON "pages_blocks_image_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_statement_order_idx" ON "pages_blocks_statement" USING btree ("_order");
  CREATE INDEX "pages_blocks_statement_parent_id_idx" ON "pages_blocks_statement" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_statement_path_idx" ON "pages_blocks_statement" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_statement_locales_locale_parent_id_unique" ON "pages_blocks_statement_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_quote_order_idx" ON "pages_blocks_quote" USING btree ("_order");
  CREATE INDEX "pages_blocks_quote_parent_id_idx" ON "pages_blocks_quote" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_quote_path_idx" ON "pages_blocks_quote" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_quote_locales_locale_parent_id_unique" ON "pages_blocks_quote_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_faq_items_order_idx" ON "pages_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_items_parent_id_idx" ON "pages_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_faq_items_locales_locale_parent_id_unique" ON "pages_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_faq_order_idx" ON "pages_blocks_faq" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_parent_id_idx" ON "pages_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_path_idx" ON "pages_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_faq_locales_locale_parent_id_unique" ON "pages_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_gallery_order_idx" ON "pages_blocks_gallery" USING btree ("_order");
  CREATE INDEX "pages_blocks_gallery_parent_id_idx" ON "pages_blocks_gallery" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_gallery_path_idx" ON "pages_blocks_gallery" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_gallery_locales_locale_parent_id_unique" ON "pages_blocks_gallery_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_timeline_entries_order_idx" ON "pages_blocks_timeline_entries" USING btree ("_order");
  CREATE INDEX "pages_blocks_timeline_entries_parent_id_idx" ON "pages_blocks_timeline_entries" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_timeline_entries_locales_locale_parent_id_uniqu" ON "pages_blocks_timeline_entries_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_timeline_order_idx" ON "pages_blocks_timeline" USING btree ("_order");
  CREATE INDEX "pages_blocks_timeline_parent_id_idx" ON "pages_blocks_timeline" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_timeline_path_idx" ON "pages_blocks_timeline" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_timeline_locales_locale_parent_id_unique" ON "pages_blocks_timeline_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_values_items_order_idx" ON "pages_blocks_values_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_values_items_parent_id_idx" ON "pages_blocks_values_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_values_items_locales_locale_parent_id_unique" ON "pages_blocks_values_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_values_order_idx" ON "pages_blocks_values" USING btree ("_order");
  CREATE INDEX "pages_blocks_values_parent_id_idx" ON "pages_blocks_values" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_values_path_idx" ON "pages_blocks_values" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_values_locales_locale_parent_id_unique" ON "pages_blocks_values_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_journey_order_idx" ON "pages_blocks_journey" USING btree ("_order");
  CREATE INDEX "pages_blocks_journey_parent_id_idx" ON "pages_blocks_journey" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_journey_path_idx" ON "pages_blocks_journey" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_journey_locales_locale_parent_id_unique" ON "pages_blocks_journey_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_night_band_buttons_order_idx" ON "pages_blocks_night_band_buttons" USING btree ("_order");
  CREATE INDEX "pages_blocks_night_band_buttons_parent_id_idx" ON "pages_blocks_night_band_buttons" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_night_band_buttons_page_idx" ON "pages_blocks_night_band_buttons" USING btree ("page_id");
  CREATE UNIQUE INDEX "pages_blocks_night_band_buttons_locales_locale_parent_id_uni" ON "pages_blocks_night_band_buttons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_night_band_order_idx" ON "pages_blocks_night_band" USING btree ("_order");
  CREATE INDEX "pages_blocks_night_band_parent_id_idx" ON "pages_blocks_night_band" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_night_band_path_idx" ON "pages_blocks_night_band" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_night_band_locales_locale_parent_id_unique" ON "pages_blocks_night_band_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_call_to_action_buttons_order_idx" ON "pages_blocks_call_to_action_buttons" USING btree ("_order");
  CREATE INDEX "pages_blocks_call_to_action_buttons_parent_id_idx" ON "pages_blocks_call_to_action_buttons" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_call_to_action_buttons_page_idx" ON "pages_blocks_call_to_action_buttons" USING btree ("page_id");
  CREATE UNIQUE INDEX "pages_blocks_call_to_action_buttons_locales_locale_parent_id" ON "pages_blocks_call_to_action_buttons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_call_to_action_order_idx" ON "pages_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "pages_blocks_call_to_action_parent_id_idx" ON "pages_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_call_to_action_path_idx" ON "pages_blocks_call_to_action" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_call_to_action_locales_locale_parent_id_unique" ON "pages_blocks_call_to_action_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_donation_order_idx" ON "pages_blocks_donation" USING btree ("_order");
  CREATE INDEX "pages_blocks_donation_parent_id_idx" ON "pages_blocks_donation" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_donation_path_idx" ON "pages_blocks_donation" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_donation_locales_locale_parent_id_unique" ON "pages_blocks_donation_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_projects_order_idx" ON "pages_blocks_projects" USING btree ("_order");
  CREATE INDEX "pages_blocks_projects_parent_id_idx" ON "pages_blocks_projects" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_projects_path_idx" ON "pages_blocks_projects" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_projects_locales_locale_parent_id_unique" ON "pages_blocks_projects_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_news_order_idx" ON "pages_blocks_news" USING btree ("_order");
  CREATE INDEX "pages_blocks_news_parent_id_idx" ON "pages_blocks_news" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_news_path_idx" ON "pages_blocks_news" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_news_locales_locale_parent_id_unique" ON "pages_blocks_news_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_focus_areas_order_idx" ON "pages_blocks_focus_areas" USING btree ("_order");
  CREATE INDEX "pages_blocks_focus_areas_parent_id_idx" ON "pages_blocks_focus_areas" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_focus_areas_path_idx" ON "pages_blocks_focus_areas" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_focus_areas_locales_locale_parent_id_unique" ON "pages_blocks_focus_areas_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_stats_order_idx" ON "pages_blocks_stats" USING btree ("_order");
  CREATE INDEX "pages_blocks_stats_parent_id_idx" ON "pages_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_stats_path_idx" ON "pages_blocks_stats" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_stats_locales_locale_parent_id_unique" ON "pages_blocks_stats_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_board_order_idx" ON "pages_blocks_board" USING btree ("_order");
  CREATE INDEX "pages_blocks_board_parent_id_idx" ON "pages_blocks_board" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_board_path_idx" ON "pages_blocks_board" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_board_locales_locale_parent_id_unique" ON "pages_blocks_board_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_partners_order_idx" ON "pages_blocks_partners" USING btree ("_order");
  CREATE INDEX "pages_blocks_partners_parent_id_idx" ON "pages_blocks_partners" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_partners_path_idx" ON "pages_blocks_partners" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_partners_locales_locale_parent_id_unique" ON "pages_blocks_partners_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_membership_form_order_idx" ON "pages_blocks_membership_form" USING btree ("_order");
  CREATE INDEX "pages_blocks_membership_form_parent_id_idx" ON "pages_blocks_membership_form" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_membership_form_path_idx" ON "pages_blocks_membership_form" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_membership_form_locales_locale_parent_id_unique" ON "pages_blocks_membership_form_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_contact_form_order_idx" ON "pages_blocks_contact_form" USING btree ("_order");
  CREATE INDEX "pages_blocks_contact_form_parent_id_idx" ON "pages_blocks_contact_form" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_contact_form_path_idx" ON "pages_blocks_contact_form" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_contact_form_locales_locale_parent_id_unique" ON "pages_blocks_contact_form_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE UNIQUE INDEX "pages_system_key_idx" ON "pages" USING btree ("system_key");
  CREATE INDEX "pages_seo_seo_og_image_idx" ON "pages" USING btree ("seo_og_image_id");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE UNIQUE INDEX "pages_locales_locale_parent_id_unique" ON "pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_rels_order_idx" ON "pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_media_id_idx" ON "pages_rels" USING btree ("media_id");
  CREATE INDEX "_pages_v_blocks_header_order_idx" ON "_pages_v_blocks_header" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_header_parent_id_idx" ON "_pages_v_blocks_header" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_header_path_idx" ON "_pages_v_blocks_header" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_header_locales_locale_parent_id_unique" ON "_pages_v_blocks_header_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_buttons_order_idx" ON "_pages_v_blocks_hero_buttons" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_buttons_parent_id_idx" ON "_pages_v_blocks_hero_buttons" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_buttons_page_idx" ON "_pages_v_blocks_hero_buttons" USING btree ("page_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_hero_buttons_locales_locale_parent_id_unique" ON "_pages_v_blocks_hero_buttons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_order_idx" ON "_pages_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_parent_id_idx" ON "_pages_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_path_idx" ON "_pages_v_blocks_hero" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_hero_locales_locale_parent_id_unique" ON "_pages_v_blocks_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_media_header_order_idx" ON "_pages_v_blocks_media_header" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_media_header_parent_id_idx" ON "_pages_v_blocks_media_header" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_media_header_path_idx" ON "_pages_v_blocks_media_header" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_media_header_image_idx" ON "_pages_v_blocks_media_header" USING btree ("image_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_media_header_locales_locale_parent_id_unique" ON "_pages_v_blocks_media_header_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_text_order_idx" ON "_pages_v_blocks_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_text_parent_id_idx" ON "_pages_v_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_text_path_idx" ON "_pages_v_blocks_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_text_locales_locale_parent_id_unique" ON "_pages_v_blocks_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_cards_items_buttons_order_idx" ON "_pages_v_blocks_cards_items_buttons" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cards_items_buttons_parent_id_idx" ON "_pages_v_blocks_cards_items_buttons" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cards_items_buttons_page_idx" ON "_pages_v_blocks_cards_items_buttons" USING btree ("page_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_cards_items_buttons_locales_locale_parent_id" ON "_pages_v_blocks_cards_items_buttons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_cards_items_order_idx" ON "_pages_v_blocks_cards_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cards_items_parent_id_idx" ON "_pages_v_blocks_cards_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_cards_items_locales_locale_parent_id_unique" ON "_pages_v_blocks_cards_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_cards_order_idx" ON "_pages_v_blocks_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cards_parent_id_idx" ON "_pages_v_blocks_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cards_path_idx" ON "_pages_v_blocks_cards" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_cards_locales_locale_parent_id_unique" ON "_pages_v_blocks_cards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_image_text_order_idx" ON "_pages_v_blocks_image_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_image_text_parent_id_idx" ON "_pages_v_blocks_image_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_image_text_path_idx" ON "_pages_v_blocks_image_text" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_image_text_image_idx" ON "_pages_v_blocks_image_text" USING btree ("image_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_image_text_locales_locale_parent_id_unique" ON "_pages_v_blocks_image_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_statement_order_idx" ON "_pages_v_blocks_statement" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_statement_parent_id_idx" ON "_pages_v_blocks_statement" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_statement_path_idx" ON "_pages_v_blocks_statement" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_statement_locales_locale_parent_id_unique" ON "_pages_v_blocks_statement_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_quote_order_idx" ON "_pages_v_blocks_quote" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_quote_parent_id_idx" ON "_pages_v_blocks_quote" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_quote_path_idx" ON "_pages_v_blocks_quote" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_quote_locales_locale_parent_id_unique" ON "_pages_v_blocks_quote_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_items_order_idx" ON "_pages_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_items_parent_id_idx" ON "_pages_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_faq_items_locales_locale_parent_id_unique" ON "_pages_v_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_order_idx" ON "_pages_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_parent_id_idx" ON "_pages_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_path_idx" ON "_pages_v_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_faq_locales_locale_parent_id_unique" ON "_pages_v_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_gallery_order_idx" ON "_pages_v_blocks_gallery" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_gallery_parent_id_idx" ON "_pages_v_blocks_gallery" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_gallery_path_idx" ON "_pages_v_blocks_gallery" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_gallery_locales_locale_parent_id_unique" ON "_pages_v_blocks_gallery_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_timeline_entries_order_idx" ON "_pages_v_blocks_timeline_entries" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_timeline_entries_parent_id_idx" ON "_pages_v_blocks_timeline_entries" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_timeline_entries_locales_locale_parent_id_un" ON "_pages_v_blocks_timeline_entries_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_timeline_order_idx" ON "_pages_v_blocks_timeline" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_timeline_parent_id_idx" ON "_pages_v_blocks_timeline" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_timeline_path_idx" ON "_pages_v_blocks_timeline" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_timeline_locales_locale_parent_id_unique" ON "_pages_v_blocks_timeline_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_values_items_order_idx" ON "_pages_v_blocks_values_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_values_items_parent_id_idx" ON "_pages_v_blocks_values_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_values_items_locales_locale_parent_id_unique" ON "_pages_v_blocks_values_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_values_order_idx" ON "_pages_v_blocks_values" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_values_parent_id_idx" ON "_pages_v_blocks_values" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_values_path_idx" ON "_pages_v_blocks_values" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_values_locales_locale_parent_id_unique" ON "_pages_v_blocks_values_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_journey_order_idx" ON "_pages_v_blocks_journey" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_journey_parent_id_idx" ON "_pages_v_blocks_journey" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_journey_path_idx" ON "_pages_v_blocks_journey" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_journey_locales_locale_parent_id_unique" ON "_pages_v_blocks_journey_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_night_band_buttons_order_idx" ON "_pages_v_blocks_night_band_buttons" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_night_band_buttons_parent_id_idx" ON "_pages_v_blocks_night_band_buttons" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_night_band_buttons_page_idx" ON "_pages_v_blocks_night_band_buttons" USING btree ("page_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_night_band_buttons_locales_locale_parent_id_" ON "_pages_v_blocks_night_band_buttons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_night_band_order_idx" ON "_pages_v_blocks_night_band" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_night_band_parent_id_idx" ON "_pages_v_blocks_night_band" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_night_band_path_idx" ON "_pages_v_blocks_night_band" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_night_band_locales_locale_parent_id_unique" ON "_pages_v_blocks_night_band_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_call_to_action_buttons_order_idx" ON "_pages_v_blocks_call_to_action_buttons" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_call_to_action_buttons_parent_id_idx" ON "_pages_v_blocks_call_to_action_buttons" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_call_to_action_buttons_page_idx" ON "_pages_v_blocks_call_to_action_buttons" USING btree ("page_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_call_to_action_buttons_locales_locale_parent" ON "_pages_v_blocks_call_to_action_buttons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_call_to_action_order_idx" ON "_pages_v_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_call_to_action_parent_id_idx" ON "_pages_v_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_call_to_action_path_idx" ON "_pages_v_blocks_call_to_action" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_call_to_action_locales_locale_parent_id_uniq" ON "_pages_v_blocks_call_to_action_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_donation_order_idx" ON "_pages_v_blocks_donation" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_donation_parent_id_idx" ON "_pages_v_blocks_donation" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_donation_path_idx" ON "_pages_v_blocks_donation" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_donation_locales_locale_parent_id_unique" ON "_pages_v_blocks_donation_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_projects_order_idx" ON "_pages_v_blocks_projects" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_projects_parent_id_idx" ON "_pages_v_blocks_projects" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_projects_path_idx" ON "_pages_v_blocks_projects" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_projects_locales_locale_parent_id_unique" ON "_pages_v_blocks_projects_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_news_order_idx" ON "_pages_v_blocks_news" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_news_parent_id_idx" ON "_pages_v_blocks_news" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_news_path_idx" ON "_pages_v_blocks_news" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_news_locales_locale_parent_id_unique" ON "_pages_v_blocks_news_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_focus_areas_order_idx" ON "_pages_v_blocks_focus_areas" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_focus_areas_parent_id_idx" ON "_pages_v_blocks_focus_areas" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_focus_areas_path_idx" ON "_pages_v_blocks_focus_areas" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_focus_areas_locales_locale_parent_id_unique" ON "_pages_v_blocks_focus_areas_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_stats_order_idx" ON "_pages_v_blocks_stats" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_stats_parent_id_idx" ON "_pages_v_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_stats_path_idx" ON "_pages_v_blocks_stats" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_stats_locales_locale_parent_id_unique" ON "_pages_v_blocks_stats_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_board_order_idx" ON "_pages_v_blocks_board" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_board_parent_id_idx" ON "_pages_v_blocks_board" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_board_path_idx" ON "_pages_v_blocks_board" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_board_locales_locale_parent_id_unique" ON "_pages_v_blocks_board_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_partners_order_idx" ON "_pages_v_blocks_partners" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_partners_parent_id_idx" ON "_pages_v_blocks_partners" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_partners_path_idx" ON "_pages_v_blocks_partners" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_partners_locales_locale_parent_id_unique" ON "_pages_v_blocks_partners_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_membership_form_order_idx" ON "_pages_v_blocks_membership_form" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_membership_form_parent_id_idx" ON "_pages_v_blocks_membership_form" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_membership_form_path_idx" ON "_pages_v_blocks_membership_form" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_membership_form_locales_locale_parent_id_uni" ON "_pages_v_blocks_membership_form_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_contact_form_order_idx" ON "_pages_v_blocks_contact_form" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_contact_form_parent_id_idx" ON "_pages_v_blocks_contact_form" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_contact_form_path_idx" ON "_pages_v_blocks_contact_form" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_contact_form_locales_locale_parent_id_unique" ON "_pages_v_blocks_contact_form_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_version_system_key_idx" ON "_pages_v" USING btree ("version_system_key");
  CREATE INDEX "_pages_v_version_seo_version_seo_og_image_idx" ON "_pages_v" USING btree ("version_seo_og_image_id");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_snapshot_idx" ON "_pages_v" USING btree ("snapshot");
  CREATE INDEX "_pages_v_published_locale_idx" ON "_pages_v" USING btree ("published_locale");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "_pages_v_autosave_idx" ON "_pages_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_pages_v_locales_locale_parent_id_unique" ON "_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_rels_order_idx" ON "_pages_v_rels" USING btree ("order");
  CREATE INDEX "_pages_v_rels_parent_idx" ON "_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pages_v_rels_path_idx" ON "_pages_v_rels" USING btree ("path");
  CREATE INDEX "_pages_v_rels_media_id_idx" ON "_pages_v_rels" USING btree ("media_id");
  CREATE UNIQUE INDEX "form_texts_locales_locale_parent_id_unique" ON "form_texts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_form_texts_v_created_at_idx" ON "_form_texts_v" USING btree ("created_at");
  CREATE INDEX "_form_texts_v_updated_at_idx" ON "_form_texts_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "_form_texts_v_locales_locale_parent_id_unique" ON "_form_texts_v_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Scheduled publications are jobs of a task the older schema does not know.
  await db.execute(sql`
  DELETE FROM "payload_jobs" WHERE "task_slug" = 'schedulePublish';
  DELETE FROM "payload_jobs_log" WHERE "task_slug" = 'schedulePublish';`)
  await db.execute(sql`
   ALTER TABLE "pages_blocks_header" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_header_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_hero_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_hero_buttons_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_hero_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_media_header" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_media_header_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_cards_items_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_cards_items_buttons_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_cards_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_cards_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_cards_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_image_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_image_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_statement" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_statement_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_quote" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_quote_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_gallery_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_timeline_entries" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_timeline_entries_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_timeline" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_timeline_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_values_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_values_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_values" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_values_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_journey" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_journey_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_night_band_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_night_band_buttons_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_night_band" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_night_band_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_call_to_action_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_call_to_action_buttons_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_call_to_action" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_call_to_action_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_donation" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_donation_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_projects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_projects_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_news" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_news_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_focus_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_focus_areas_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_stats_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_board" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_board_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_partners" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_partners_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_membership_form" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_membership_form_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_contact_form" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_contact_form_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_header" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_header_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_hero_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_hero_buttons_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_hero_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_media_header" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_media_header_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_cards_items_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_cards_items_buttons_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_cards_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_cards_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_cards_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_image_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_image_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_statement" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_statement_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_quote" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_quote_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_gallery_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_timeline_entries" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_timeline_entries_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_timeline" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_timeline_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_values_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_values_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_values" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_values_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_journey" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_journey_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_night_band_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_night_band_buttons_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_night_band" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_night_band_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_call_to_action_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_call_to_action_buttons_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_call_to_action" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_call_to_action_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_donation" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_donation_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_projects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_projects_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_news" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_news_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_focus_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_focus_areas_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_stats_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_board" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_board_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_partners" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_partners_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_membership_form" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_membership_form_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_contact_form" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_contact_form_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "form_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "form_texts_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_form_texts_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_form_texts_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_header" CASCADE;
  DROP TABLE "pages_blocks_header_locales" CASCADE;
  DROP TABLE "pages_blocks_hero_buttons" CASCADE;
  DROP TABLE "pages_blocks_hero_buttons_locales" CASCADE;
  DROP TABLE "pages_blocks_hero" CASCADE;
  DROP TABLE "pages_blocks_hero_locales" CASCADE;
  DROP TABLE "pages_blocks_media_header" CASCADE;
  DROP TABLE "pages_blocks_media_header_locales" CASCADE;
  DROP TABLE "pages_blocks_text" CASCADE;
  DROP TABLE "pages_blocks_text_locales" CASCADE;
  DROP TABLE "pages_blocks_cards_items_buttons" CASCADE;
  DROP TABLE "pages_blocks_cards_items_buttons_locales" CASCADE;
  DROP TABLE "pages_blocks_cards_items" CASCADE;
  DROP TABLE "pages_blocks_cards_items_locales" CASCADE;
  DROP TABLE "pages_blocks_cards" CASCADE;
  DROP TABLE "pages_blocks_cards_locales" CASCADE;
  DROP TABLE "pages_blocks_image_text" CASCADE;
  DROP TABLE "pages_blocks_image_text_locales" CASCADE;
  DROP TABLE "pages_blocks_statement" CASCADE;
  DROP TABLE "pages_blocks_statement_locales" CASCADE;
  DROP TABLE "pages_blocks_quote" CASCADE;
  DROP TABLE "pages_blocks_quote_locales" CASCADE;
  DROP TABLE "pages_blocks_faq_items" CASCADE;
  DROP TABLE "pages_blocks_faq_items_locales" CASCADE;
  DROP TABLE "pages_blocks_faq" CASCADE;
  DROP TABLE "pages_blocks_faq_locales" CASCADE;
  DROP TABLE "pages_blocks_gallery" CASCADE;
  DROP TABLE "pages_blocks_gallery_locales" CASCADE;
  DROP TABLE "pages_blocks_timeline_entries" CASCADE;
  DROP TABLE "pages_blocks_timeline_entries_locales" CASCADE;
  DROP TABLE "pages_blocks_timeline" CASCADE;
  DROP TABLE "pages_blocks_timeline_locales" CASCADE;
  DROP TABLE "pages_blocks_values_items" CASCADE;
  DROP TABLE "pages_blocks_values_items_locales" CASCADE;
  DROP TABLE "pages_blocks_values" CASCADE;
  DROP TABLE "pages_blocks_values_locales" CASCADE;
  DROP TABLE "pages_blocks_journey" CASCADE;
  DROP TABLE "pages_blocks_journey_locales" CASCADE;
  DROP TABLE "pages_blocks_night_band_buttons" CASCADE;
  DROP TABLE "pages_blocks_night_band_buttons_locales" CASCADE;
  DROP TABLE "pages_blocks_night_band" CASCADE;
  DROP TABLE "pages_blocks_night_band_locales" CASCADE;
  DROP TABLE "pages_blocks_call_to_action_buttons" CASCADE;
  DROP TABLE "pages_blocks_call_to_action_buttons_locales" CASCADE;
  DROP TABLE "pages_blocks_call_to_action" CASCADE;
  DROP TABLE "pages_blocks_call_to_action_locales" CASCADE;
  DROP TABLE "pages_blocks_donation" CASCADE;
  DROP TABLE "pages_blocks_donation_locales" CASCADE;
  DROP TABLE "pages_blocks_projects" CASCADE;
  DROP TABLE "pages_blocks_projects_locales" CASCADE;
  DROP TABLE "pages_blocks_news" CASCADE;
  DROP TABLE "pages_blocks_news_locales" CASCADE;
  DROP TABLE "pages_blocks_focus_areas" CASCADE;
  DROP TABLE "pages_blocks_focus_areas_locales" CASCADE;
  DROP TABLE "pages_blocks_stats" CASCADE;
  DROP TABLE "pages_blocks_stats_locales" CASCADE;
  DROP TABLE "pages_blocks_board" CASCADE;
  DROP TABLE "pages_blocks_board_locales" CASCADE;
  DROP TABLE "pages_blocks_partners" CASCADE;
  DROP TABLE "pages_blocks_partners_locales" CASCADE;
  DROP TABLE "pages_blocks_membership_form" CASCADE;
  DROP TABLE "pages_blocks_membership_form_locales" CASCADE;
  DROP TABLE "pages_blocks_contact_form" CASCADE;
  DROP TABLE "pages_blocks_contact_form_locales" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "pages_locales" CASCADE;
  DROP TABLE "pages_rels" CASCADE;
  DROP TABLE "_pages_v_blocks_header" CASCADE;
  DROP TABLE "_pages_v_blocks_header_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_buttons" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_buttons_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_hero" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_media_header" CASCADE;
  DROP TABLE "_pages_v_blocks_media_header_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_text" CASCADE;
  DROP TABLE "_pages_v_blocks_text_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_cards_items_buttons" CASCADE;
  DROP TABLE "_pages_v_blocks_cards_items_buttons_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_cards_items" CASCADE;
  DROP TABLE "_pages_v_blocks_cards_items_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_cards" CASCADE;
  DROP TABLE "_pages_v_blocks_cards_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_image_text" CASCADE;
  DROP TABLE "_pages_v_blocks_image_text_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_statement" CASCADE;
  DROP TABLE "_pages_v_blocks_statement_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_quote" CASCADE;
  DROP TABLE "_pages_v_blocks_quote_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_items" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_items_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_faq" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_gallery" CASCADE;
  DROP TABLE "_pages_v_blocks_gallery_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_timeline_entries" CASCADE;
  DROP TABLE "_pages_v_blocks_timeline_entries_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_timeline" CASCADE;
  DROP TABLE "_pages_v_blocks_timeline_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_values_items" CASCADE;
  DROP TABLE "_pages_v_blocks_values_items_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_values" CASCADE;
  DROP TABLE "_pages_v_blocks_values_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_journey" CASCADE;
  DROP TABLE "_pages_v_blocks_journey_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_night_band_buttons" CASCADE;
  DROP TABLE "_pages_v_blocks_night_band_buttons_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_night_band" CASCADE;
  DROP TABLE "_pages_v_blocks_night_band_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_call_to_action_buttons" CASCADE;
  DROP TABLE "_pages_v_blocks_call_to_action_buttons_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_call_to_action" CASCADE;
  DROP TABLE "_pages_v_blocks_call_to_action_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_donation" CASCADE;
  DROP TABLE "_pages_v_blocks_donation_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_projects" CASCADE;
  DROP TABLE "_pages_v_blocks_projects_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_news" CASCADE;
  DROP TABLE "_pages_v_blocks_news_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_focus_areas" CASCADE;
  DROP TABLE "_pages_v_blocks_focus_areas_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_stats" CASCADE;
  DROP TABLE "_pages_v_blocks_stats_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_board" CASCADE;
  DROP TABLE "_pages_v_blocks_board_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_partners" CASCADE;
  DROP TABLE "_pages_v_blocks_partners_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_membership_form" CASCADE;
  DROP TABLE "_pages_v_blocks_membership_form_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_contact_form" CASCADE;
  DROP TABLE "_pages_v_blocks_contact_form_locales" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "_pages_v_locales" CASCADE;
  DROP TABLE "_pages_v_rels" CASCADE;
  DROP TABLE "form_texts" CASCADE;
  DROP TABLE "form_texts_locales" CASCADE;
  DROP TABLE "_form_texts_v" CASCADE;
  DROP TABLE "_form_texts_v_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_pages_fk";
  
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'retention', 'auth-cleanup', 'audit-retention', 'membership-reminders', 'notifications-retention');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'retention', 'auth-cleanup', 'audit-retention', 'membership-reminders', 'notifications-retention');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "payload_locked_documents_rels_pages_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pages_id";
  DROP TYPE "public"."enum_pages_blocks_hero_buttons_kind";
  DROP TYPE "public"."enum_pages_blocks_hero_buttons_route";
  DROP TYPE "public"."enum_pages_blocks_text_surface";
  DROP TYPE "public"."enum_pages_blocks_cards_items_buttons_kind";
  DROP TYPE "public"."enum_pages_blocks_cards_items_buttons_route";
  DROP TYPE "public"."enum_pages_blocks_cards_items_icon";
  DROP TYPE "public"."enum_pages_blocks_image_text_image_position";
  DROP TYPE "public"."enum_pages_blocks_night_band_buttons_kind";
  DROP TYPE "public"."enum_pages_blocks_night_band_buttons_route";
  DROP TYPE "public"."enum_pages_blocks_call_to_action_buttons_kind";
  DROP TYPE "public"."enum_pages_blocks_call_to_action_buttons_route";
  DROP TYPE "public"."enum_pages_blocks_news_count";
  DROP TYPE "public"."enum_pages_blocks_focus_areas_variant";
  DROP TYPE "public"."enum_pages_system_key";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_blocks_hero_buttons_kind";
  DROP TYPE "public"."enum__pages_v_blocks_hero_buttons_route";
  DROP TYPE "public"."enum__pages_v_blocks_text_surface";
  DROP TYPE "public"."enum__pages_v_blocks_cards_items_buttons_kind";
  DROP TYPE "public"."enum__pages_v_blocks_cards_items_buttons_route";
  DROP TYPE "public"."enum__pages_v_blocks_cards_items_icon";
  DROP TYPE "public"."enum__pages_v_blocks_image_text_image_position";
  DROP TYPE "public"."enum__pages_v_blocks_night_band_buttons_kind";
  DROP TYPE "public"."enum__pages_v_blocks_night_band_buttons_route";
  DROP TYPE "public"."enum__pages_v_blocks_call_to_action_buttons_kind";
  DROP TYPE "public"."enum__pages_v_blocks_call_to_action_buttons_route";
  DROP TYPE "public"."enum__pages_v_blocks_news_count";
  DROP TYPE "public"."enum__pages_v_blocks_focus_areas_variant";
  DROP TYPE "public"."enum__pages_v_version_system_key";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum__pages_v_published_locale";`)
}
