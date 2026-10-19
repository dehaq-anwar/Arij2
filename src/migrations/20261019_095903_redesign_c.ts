import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "projects" ALTER COLUMN "stage" DROP DEFAULT;
  ALTER TABLE "_projects_v" ALTER COLUMN "version_stage" DROP DEFAULT;
  ALTER TABLE "media" ADD COLUMN "prefix" varchar DEFAULT '';
  ALTER TABLE "home_page_locales" ADD COLUMN "journey_from" varchar;
  ALTER TABLE "home_page_locales" ADD COLUMN "journey_to" varchar;
  ALTER TABLE "about_page_locales" ADD COLUMN "mission" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "tagline" varchar;
  ALTER TABLE "home_page_locales" DROP COLUMN "hero_subline";
  ALTER TABLE "home_page_locales" DROP COLUMN "mission";
  ALTER TABLE "home_page_locales" DROP COLUMN "focus_intro";
  ALTER TABLE "home_page_locales" DROP COLUMN "cta_text";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "projects" ALTER COLUMN "stage" SET DEFAULT 'ongoing';
  ALTER TABLE "_projects_v" ALTER COLUMN "version_stage" SET DEFAULT 'ongoing';
  ALTER TABLE "home_page_locales" ADD COLUMN "hero_subline" varchar;
  ALTER TABLE "home_page_locales" ADD COLUMN "mission" varchar;
  ALTER TABLE "home_page_locales" ADD COLUMN "focus_intro" varchar;
  ALTER TABLE "home_page_locales" ADD COLUMN "cta_text" varchar;
  ALTER TABLE "media" DROP COLUMN "prefix";
  ALTER TABLE "home_page_locales" DROP COLUMN "journey_from";
  ALTER TABLE "home_page_locales" DROP COLUMN "journey_to";
  ALTER TABLE "about_page_locales" DROP COLUMN "mission";
  ALTER TABLE "site_settings_locales" DROP COLUMN "tagline";`)
}
