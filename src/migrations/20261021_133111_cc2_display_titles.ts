import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "membership_applications" ADD COLUMN "display_title" varchar;
  ALTER TABLE "members" ADD COLUMN "display_title" varchar;`)

  // The title of the existing entries, as the collections' hooks compute it from now on
  // (displayTitle() in src/cms/collections/membership-fields.ts): "Last name, first name", or
  // "#<id>" for an application whose personal data were moved to the register.
  await db.execute(sql`
  UPDATE "membership_applications" SET "display_title" = CASE
    WHEN "personal_data_moved_on" IS NOT NULL THEN '#' || "id"
    ELSE COALESCE(NULLIF(CONCAT_WS(', ',
      CASE WHEN TRIM("last_name") <> '' THEN "last_name" END,
      CASE WHEN TRIM("first_name") <> '' THEN "first_name" END), ''), '#' || "id") END;
  UPDATE "members" SET "display_title" = COALESCE(NULLIF(CONCAT_WS(', ',
      CASE WHEN TRIM("last_name") <> '' THEN "last_name" END,
      CASE WHEN TRIM("first_name") <> '' THEN "first_name" END), ''), '#' || "id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "membership_applications" DROP COLUMN "display_title";
  ALTER TABLE "members" DROP COLUMN "display_title";`)
}
