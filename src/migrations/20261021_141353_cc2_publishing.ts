import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_events_count" AS ENUM('2', '4');
  CREATE TYPE "public"."enum__pages_v_blocks_events_count" AS ENUM('2', '4');
  CREATE TYPE "public"."enum_events_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__events_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__events_v_published_locale" AS ENUM('de', 'en', 'ar');
  CREATE TYPE "public"."enum_redirects_to_kind" AS ENUM('route', 'page', 'url');
  CREATE TYPE "public"."enum_redirects_to_route" AS ENUM('/', '/about', '/projects', '/news', '/events', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  CREATE TYPE "public"."enum_navigation_main_kind" AS ENUM('route', 'page', 'url');
  CREATE TYPE "public"."enum_navigation_main_route" AS ENUM('/', '/about', '/projects', '/news', '/events', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  CREATE TYPE "public"."enum_navigation_cta_kind" AS ENUM('route', 'page', 'url');
  CREATE TYPE "public"."enum_navigation_cta_route" AS ENUM('/', '/about', '/projects', '/news', '/events', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  CREATE TYPE "public"."enum__navigation_v_version_main_kind" AS ENUM('route', 'page', 'url');
  CREATE TYPE "public"."enum__navigation_v_version_main_route" AS ENUM('/', '/about', '/projects', '/news', '/events', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  CREATE TYPE "public"."enum__navigation_v_version_cta_kind" AS ENUM('route', 'page', 'url');
  CREATE TYPE "public"."enum__navigation_v_version_cta_route" AS ENUM('/', '/about', '/projects', '/news', '/events', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  CREATE TYPE "public"."enum__site_settings_v_version_social_links_platform" AS ENUM('instagram', 'facebook', 'linkedin', 'youtube', 'x', 'tiktok', 'mastodon', 'telegram', 'whatsapp');
  ALTER TYPE "public"."enum_pages_blocks_hero_buttons_route" ADD VALUE '/events' BEFORE '/membership';
  ALTER TYPE "public"."enum_pages_blocks_cards_items_buttons_route" ADD VALUE '/events' BEFORE '/membership';
  ALTER TYPE "public"."enum_pages_blocks_night_band_buttons_route" ADD VALUE '/events' BEFORE '/membership';
  ALTER TYPE "public"."enum_pages_blocks_call_to_action_buttons_route" ADD VALUE '/events' BEFORE '/membership';
  ALTER TYPE "public"."enum__pages_v_blocks_hero_buttons_route" ADD VALUE '/events' BEFORE '/membership';
  ALTER TYPE "public"."enum__pages_v_blocks_cards_items_buttons_route" ADD VALUE '/events' BEFORE '/membership';
  ALTER TYPE "public"."enum__pages_v_blocks_night_band_buttons_route" ADD VALUE '/events' BEFORE '/membership';
  ALTER TYPE "public"."enum__pages_v_blocks_call_to_action_buttons_route" ADD VALUE '/events' BEFORE '/membership';
  CREATE TABLE "pages_blocks_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"count" "enum_pages_blocks_events_count" DEFAULT '2',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_events_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"count" "enum__pages_v_blocks_events_count" DEFAULT '2',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_events_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"registration_url" varchar,
  	"cover_image_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"seo_og_image_id" integer,
  	"seo_no_index" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_events_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "events_locales" (
  	"title" varchar,
  	"excerpt" varchar,
  	"location" varchar,
  	"body" jsonb,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_events_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_starts_at" timestamp(3) with time zone,
  	"version_ends_at" timestamp(3) with time zone,
  	"version_registration_url" varchar,
  	"version_cover_image_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_seo_og_image_id" integer,
  	"version_seo_no_index" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__events_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__events_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_events_v_locales" (
  	"version_title" varchar,
  	"version_excerpt" varchar,
  	"version_location" varchar,
  	"version_body" jsonb,
  	"version_seo_meta_title" varchar,
  	"version_seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from" varchar NOT NULL,
  	"to_kind" "enum_redirects_to_kind" DEFAULT 'route' NOT NULL,
  	"to_route" "enum_redirects_to_route",
  	"to_page_id" integer,
  	"to_url" varchar,
  	"permanent" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "navigation_main" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_navigation_main_kind" DEFAULT 'route' NOT NULL,
  	"route" "enum_navigation_main_route",
  	"page_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "navigation_main_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "navigation" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"cta_kind" "enum_navigation_cta_kind" DEFAULT 'route' NOT NULL,
  	"cta_route" "enum_navigation_cta_route",
  	"cta_page_id" integer,
  	"cta_url" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "navigation_locales" (
  	"cta_label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_navigation_v_version_main" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum__navigation_v_version_main_kind" DEFAULT 'route' NOT NULL,
  	"route" "enum__navigation_v_version_main_route",
  	"page_id" integer,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_navigation_v_version_main_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_navigation_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_cta_kind" "enum__navigation_v_version_cta_kind" DEFAULT 'route' NOT NULL,
  	"version_cta_route" "enum__navigation_v_version_cta_route",
  	"version_cta_page_id" integer,
  	"version_cta_url" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_navigation_v_locales" (
  	"version_cta_label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_legal_notice_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_last_updated" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_legal_notice_v_locales" (
  	"version_content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_privacy_policy_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_last_updated" timestamp(3) with time zone,
  	"version_version" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_privacy_policy_v_locales" (
  	"version_content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_site_settings_v_version_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"platform" "enum__site_settings_v_version_social_links_platform" NOT NULL,
  	"url" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_site_settings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_contact_email" varchar,
  	"version_contact_phone" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_site_settings_v_locales" (
  	"version_description" varchar,
  	"version_tagline" varchar,
  	"version_contact_address" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "pages" ADD COLUMN "seo_no_index" boolean DEFAULT false;
  ALTER TABLE "_pages_v" ADD COLUMN "version_seo_no_index" boolean DEFAULT false;
  ALTER TABLE "projects" ADD COLUMN "seo_no_index" boolean DEFAULT false;
  ALTER TABLE "_projects_v" ADD COLUMN "version_seo_no_index" boolean DEFAULT false;
  ALTER TABLE "_projects_v" ADD COLUMN "autosave" boolean;
  ALTER TABLE "news" ADD COLUMN "seo_no_index" boolean DEFAULT false;
  ALTER TABLE "_news_v" ADD COLUMN "version_seo_no_index" boolean DEFAULT false;
  ALTER TABLE "_news_v" ADD COLUMN "autosave" boolean;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "events_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "redirects_id" integer;
  ALTER TABLE "pages_blocks_events" ADD CONSTRAINT "pages_blocks_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_events_locales" ADD CONSTRAINT "pages_blocks_events_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_events" ADD CONSTRAINT "_pages_v_blocks_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_events_locales" ADD CONSTRAINT "_pages_v_blocks_events_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_locales" ADD CONSTRAINT "events_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_parent_id_events_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_cover_image_id_media_id_fk" FOREIGN KEY ("version_cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v_locales" ADD CONSTRAINT "_events_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects" ADD CONSTRAINT "redirects_to_page_id_pages_id_fk" FOREIGN KEY ("to_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_main" ADD CONSTRAINT "navigation_main_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_main" ADD CONSTRAINT "navigation_main_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_main_locales" ADD CONSTRAINT "navigation_main_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_main"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation" ADD CONSTRAINT "navigation_cta_page_id_pages_id_fk" FOREIGN KEY ("cta_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_locales" ADD CONSTRAINT "navigation_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_main" ADD CONSTRAINT "_navigation_v_version_main_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_main" ADD CONSTRAINT "_navigation_v_version_main_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_main_locales" ADD CONSTRAINT "_navigation_v_version_main_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v_version_main"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v" ADD CONSTRAINT "_navigation_v_version_cta_page_id_pages_id_fk" FOREIGN KEY ("version_cta_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_navigation_v_locales" ADD CONSTRAINT "_navigation_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_legal_notice_v_locales" ADD CONSTRAINT "_legal_notice_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_legal_notice_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_privacy_policy_v_locales" ADD CONSTRAINT "_privacy_policy_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_privacy_policy_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_settings_v_version_social_links" ADD CONSTRAINT "_site_settings_v_version_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_settings_v_locales" ADD CONSTRAINT "_site_settings_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_events_order_idx" ON "pages_blocks_events" USING btree ("_order");
  CREATE INDEX "pages_blocks_events_parent_id_idx" ON "pages_blocks_events" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_events_path_idx" ON "pages_blocks_events" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_events_locales_locale_parent_id_unique" ON "pages_blocks_events_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_events_order_idx" ON "_pages_v_blocks_events" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_events_parent_id_idx" ON "_pages_v_blocks_events" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_events_path_idx" ON "_pages_v_blocks_events" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_events_locales_locale_parent_id_unique" ON "_pages_v_blocks_events_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");
  CREATE INDEX "events_starts_at_idx" ON "events" USING btree ("starts_at");
  CREATE INDEX "events_cover_image_idx" ON "events" USING btree ("cover_image_id");
  CREATE INDEX "events_seo_seo_og_image_idx" ON "events" USING btree ("seo_og_image_id");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "events__status_idx" ON "events" USING btree ("_status");
  CREATE UNIQUE INDEX "events_locales_locale_parent_id_unique" ON "events_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_events_v_parent_idx" ON "_events_v" USING btree ("parent_id");
  CREATE INDEX "_events_v_version_version_slug_idx" ON "_events_v" USING btree ("version_slug");
  CREATE INDEX "_events_v_version_version_starts_at_idx" ON "_events_v" USING btree ("version_starts_at");
  CREATE INDEX "_events_v_version_version_cover_image_idx" ON "_events_v" USING btree ("version_cover_image_id");
  CREATE INDEX "_events_v_version_seo_version_seo_og_image_idx" ON "_events_v" USING btree ("version_seo_og_image_id");
  CREATE INDEX "_events_v_version_version_updated_at_idx" ON "_events_v" USING btree ("version_updated_at");
  CREATE INDEX "_events_v_version_version_created_at_idx" ON "_events_v" USING btree ("version_created_at");
  CREATE INDEX "_events_v_version_version__status_idx" ON "_events_v" USING btree ("version__status");
  CREATE INDEX "_events_v_created_at_idx" ON "_events_v" USING btree ("created_at");
  CREATE INDEX "_events_v_updated_at_idx" ON "_events_v" USING btree ("updated_at");
  CREATE INDEX "_events_v_snapshot_idx" ON "_events_v" USING btree ("snapshot");
  CREATE INDEX "_events_v_published_locale_idx" ON "_events_v" USING btree ("published_locale");
  CREATE INDEX "_events_v_latest_idx" ON "_events_v" USING btree ("latest");
  CREATE INDEX "_events_v_autosave_idx" ON "_events_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_events_v_locales_locale_parent_id_unique" ON "_events_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "redirects_from_idx" ON "redirects" USING btree ("from");
  CREATE INDEX "redirects_to_to_page_idx" ON "redirects" USING btree ("to_page_id");
  CREATE INDEX "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "redirects" USING btree ("created_at");
  CREATE INDEX "navigation_main_order_idx" ON "navigation_main" USING btree ("_order");
  CREATE INDEX "navigation_main_parent_id_idx" ON "navigation_main" USING btree ("_parent_id");
  CREATE INDEX "navigation_main_page_idx" ON "navigation_main" USING btree ("page_id");
  CREATE UNIQUE INDEX "navigation_main_locales_locale_parent_id_unique" ON "navigation_main_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "navigation_cta_cta_page_idx" ON "navigation" USING btree ("cta_page_id");
  CREATE UNIQUE INDEX "navigation_locales_locale_parent_id_unique" ON "navigation_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_navigation_v_version_main_order_idx" ON "_navigation_v_version_main" USING btree ("_order");
  CREATE INDEX "_navigation_v_version_main_parent_id_idx" ON "_navigation_v_version_main" USING btree ("_parent_id");
  CREATE INDEX "_navigation_v_version_main_page_idx" ON "_navigation_v_version_main" USING btree ("page_id");
  CREATE UNIQUE INDEX "_navigation_v_version_main_locales_locale_parent_id_unique" ON "_navigation_v_version_main_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_navigation_v_version_cta_version_cta_page_idx" ON "_navigation_v" USING btree ("version_cta_page_id");
  CREATE INDEX "_navigation_v_created_at_idx" ON "_navigation_v" USING btree ("created_at");
  CREATE INDEX "_navigation_v_updated_at_idx" ON "_navigation_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "_navigation_v_locales_locale_parent_id_unique" ON "_navigation_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_legal_notice_v_created_at_idx" ON "_legal_notice_v" USING btree ("created_at");
  CREATE INDEX "_legal_notice_v_updated_at_idx" ON "_legal_notice_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "_legal_notice_v_locales_locale_parent_id_unique" ON "_legal_notice_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_privacy_policy_v_created_at_idx" ON "_privacy_policy_v" USING btree ("created_at");
  CREATE INDEX "_privacy_policy_v_updated_at_idx" ON "_privacy_policy_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "_privacy_policy_v_locales_locale_parent_id_unique" ON "_privacy_policy_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_site_settings_v_version_social_links_order_idx" ON "_site_settings_v_version_social_links" USING btree ("_order");
  CREATE INDEX "_site_settings_v_version_social_links_parent_id_idx" ON "_site_settings_v_version_social_links" USING btree ("_parent_id");
  CREATE INDEX "_site_settings_v_created_at_idx" ON "_site_settings_v" USING btree ("created_at");
  CREATE INDEX "_site_settings_v_updated_at_idx" ON "_site_settings_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "_site_settings_v_locales_locale_parent_id_unique" ON "_site_settings_v_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "_projects_v_autosave_idx" ON "_projects_v" USING btree ("autosave");
  CREATE INDEX "_news_v_autosave_idx" ON "_news_v" USING btree ("autosave");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload_locked_documents_rels" USING btree ("redirects_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_events_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_events_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_events_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_events_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "redirects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_main" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_main_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_navigation_v_version_main" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_navigation_v_version_main_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_navigation_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_navigation_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_legal_notice_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_legal_notice_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_privacy_policy_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_privacy_policy_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_site_settings_v_version_social_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_site_settings_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_site_settings_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_events" CASCADE;
  DROP TABLE "pages_blocks_events_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_events" CASCADE;
  DROP TABLE "_pages_v_blocks_events_locales" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "events_locales" CASCADE;
  DROP TABLE "_events_v" CASCADE;
  DROP TABLE "_events_v_locales" CASCADE;
  DROP TABLE "redirects" CASCADE;
  DROP TABLE "navigation_main" CASCADE;
  DROP TABLE "navigation_main_locales" CASCADE;
  DROP TABLE "navigation" CASCADE;
  DROP TABLE "navigation_locales" CASCADE;
  DROP TABLE "_navigation_v_version_main" CASCADE;
  DROP TABLE "_navigation_v_version_main_locales" CASCADE;
  DROP TABLE "_navigation_v" CASCADE;
  DROP TABLE "_navigation_v_locales" CASCADE;
  DROP TABLE "_legal_notice_v" CASCADE;
  DROP TABLE "_legal_notice_v_locales" CASCADE;
  DROP TABLE "_privacy_policy_v" CASCADE;
  DROP TABLE "_privacy_policy_v_locales" CASCADE;
  DROP TABLE "_site_settings_v_version_social_links" CASCADE;
  DROP TABLE "_site_settings_v" CASCADE;
  DROP TABLE "_site_settings_v_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_events_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_redirects_fk";
  
  ALTER TABLE "pages_blocks_hero_buttons" ALTER COLUMN "route" SET DATA TYPE text;
  DROP TYPE "public"."enum_pages_blocks_hero_buttons_route";
  CREATE TYPE "public"."enum_pages_blocks_hero_buttons_route" AS ENUM('/', '/about', '/projects', '/news', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  ALTER TABLE "pages_blocks_hero_buttons" ALTER COLUMN "route" SET DATA TYPE "public"."enum_pages_blocks_hero_buttons_route" USING "route"::"public"."enum_pages_blocks_hero_buttons_route";
  ALTER TABLE "pages_blocks_cards_items_buttons" ALTER COLUMN "route" SET DATA TYPE text;
  DROP TYPE "public"."enum_pages_blocks_cards_items_buttons_route";
  CREATE TYPE "public"."enum_pages_blocks_cards_items_buttons_route" AS ENUM('/', '/about', '/projects', '/news', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  ALTER TABLE "pages_blocks_cards_items_buttons" ALTER COLUMN "route" SET DATA TYPE "public"."enum_pages_blocks_cards_items_buttons_route" USING "route"::"public"."enum_pages_blocks_cards_items_buttons_route";
  ALTER TABLE "pages_blocks_night_band_buttons" ALTER COLUMN "route" SET DATA TYPE text;
  DROP TYPE "public"."enum_pages_blocks_night_band_buttons_route";
  CREATE TYPE "public"."enum_pages_blocks_night_band_buttons_route" AS ENUM('/', '/about', '/projects', '/news', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  ALTER TABLE "pages_blocks_night_band_buttons" ALTER COLUMN "route" SET DATA TYPE "public"."enum_pages_blocks_night_band_buttons_route" USING "route"::"public"."enum_pages_blocks_night_band_buttons_route";
  ALTER TABLE "pages_blocks_call_to_action_buttons" ALTER COLUMN "route" SET DATA TYPE text;
  DROP TYPE "public"."enum_pages_blocks_call_to_action_buttons_route";
  CREATE TYPE "public"."enum_pages_blocks_call_to_action_buttons_route" AS ENUM('/', '/about', '/projects', '/news', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  ALTER TABLE "pages_blocks_call_to_action_buttons" ALTER COLUMN "route" SET DATA TYPE "public"."enum_pages_blocks_call_to_action_buttons_route" USING "route"::"public"."enum_pages_blocks_call_to_action_buttons_route";
  ALTER TABLE "_pages_v_blocks_hero_buttons" ALTER COLUMN "route" SET DATA TYPE text;
  DROP TYPE "public"."enum__pages_v_blocks_hero_buttons_route";
  CREATE TYPE "public"."enum__pages_v_blocks_hero_buttons_route" AS ENUM('/', '/about', '/projects', '/news', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  ALTER TABLE "_pages_v_blocks_hero_buttons" ALTER COLUMN "route" SET DATA TYPE "public"."enum__pages_v_blocks_hero_buttons_route" USING "route"::"public"."enum__pages_v_blocks_hero_buttons_route";
  ALTER TABLE "_pages_v_blocks_cards_items_buttons" ALTER COLUMN "route" SET DATA TYPE text;
  DROP TYPE "public"."enum__pages_v_blocks_cards_items_buttons_route";
  CREATE TYPE "public"."enum__pages_v_blocks_cards_items_buttons_route" AS ENUM('/', '/about', '/projects', '/news', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  ALTER TABLE "_pages_v_blocks_cards_items_buttons" ALTER COLUMN "route" SET DATA TYPE "public"."enum__pages_v_blocks_cards_items_buttons_route" USING "route"::"public"."enum__pages_v_blocks_cards_items_buttons_route";
  ALTER TABLE "_pages_v_blocks_night_band_buttons" ALTER COLUMN "route" SET DATA TYPE text;
  DROP TYPE "public"."enum__pages_v_blocks_night_band_buttons_route";
  CREATE TYPE "public"."enum__pages_v_blocks_night_band_buttons_route" AS ENUM('/', '/about', '/projects', '/news', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  ALTER TABLE "_pages_v_blocks_night_band_buttons" ALTER COLUMN "route" SET DATA TYPE "public"."enum__pages_v_blocks_night_band_buttons_route" USING "route"::"public"."enum__pages_v_blocks_night_band_buttons_route";
  ALTER TABLE "_pages_v_blocks_call_to_action_buttons" ALTER COLUMN "route" SET DATA TYPE text;
  DROP TYPE "public"."enum__pages_v_blocks_call_to_action_buttons_route";
  CREATE TYPE "public"."enum__pages_v_blocks_call_to_action_buttons_route" AS ENUM('/', '/about', '/projects', '/news', '/membership', '/support', '/contact', '/legal-notice', '/privacy');
  ALTER TABLE "_pages_v_blocks_call_to_action_buttons" ALTER COLUMN "route" SET DATA TYPE "public"."enum__pages_v_blocks_call_to_action_buttons_route" USING "route"::"public"."enum__pages_v_blocks_call_to_action_buttons_route";
  DROP INDEX "_projects_v_autosave_idx";
  DROP INDEX "_news_v_autosave_idx";
  DROP INDEX "payload_locked_documents_rels_events_id_idx";
  DROP INDEX "payload_locked_documents_rels_redirects_id_idx";
  ALTER TABLE "pages" DROP COLUMN "seo_no_index";
  ALTER TABLE "_pages_v" DROP COLUMN "version_seo_no_index";
  ALTER TABLE "projects" DROP COLUMN "seo_no_index";
  ALTER TABLE "_projects_v" DROP COLUMN "version_seo_no_index";
  ALTER TABLE "_projects_v" DROP COLUMN "autosave";
  ALTER TABLE "news" DROP COLUMN "seo_no_index";
  ALTER TABLE "_news_v" DROP COLUMN "version_seo_no_index";
  ALTER TABLE "_news_v" DROP COLUMN "autosave";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "events_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "redirects_id";
  DROP TYPE "public"."enum_pages_blocks_events_count";
  DROP TYPE "public"."enum__pages_v_blocks_events_count";
  DROP TYPE "public"."enum_events_status";
  DROP TYPE "public"."enum__events_v_version_status";
  DROP TYPE "public"."enum__events_v_published_locale";
  DROP TYPE "public"."enum_redirects_to_kind";
  DROP TYPE "public"."enum_redirects_to_route";
  DROP TYPE "public"."enum_navigation_main_kind";
  DROP TYPE "public"."enum_navigation_main_route";
  DROP TYPE "public"."enum_navigation_cta_kind";
  DROP TYPE "public"."enum_navigation_cta_route";
  DROP TYPE "public"."enum__navigation_v_version_main_kind";
  DROP TYPE "public"."enum__navigation_v_version_main_route";
  DROP TYPE "public"."enum__navigation_v_version_cta_kind";
  DROP TYPE "public"."enum__navigation_v_version_cta_route";
  DROP TYPE "public"."enum__site_settings_v_version_social_links_platform";`)
}
