import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_members_review_outcome" AS ENUM('pending', 'retainedAll', 'retainedMinimal');
  CREATE TYPE "public"."enum_members_retention_reason" AS ENUM('legal', 'accounting', 'proof', 'other');
  ALTER TYPE "public"."enum_case_events_event" ADD VALUE 'member.reviewed';
  ALTER TYPE "public"."enum_case_events_event" ADD VALUE 'application.moved';
  ALTER TYPE "public"."enum_notifications_kind" ADD VALUE 'memberReviewDue';
  ALTER TYPE "public"."enum_notifications_kind" ADD VALUE 'memberReduced';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'notifications-retention';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'notifications-retention';
  ALTER TABLE "membership_applications" ALTER COLUMN "first_name" DROP NOT NULL;
  ALTER TABLE "membership_applications" ALTER COLUMN "last_name" DROP NOT NULL;
  ALTER TABLE "membership_applications" ALTER COLUMN "email" DROP NOT NULL;
  ALTER TABLE "membership_applications" ALTER COLUMN "address_street" DROP NOT NULL;
  ALTER TABLE "membership_applications" ALTER COLUMN "address_postal_code" DROP NOT NULL;
  ALTER TABLE "membership_applications" ALTER COLUMN "address_city" DROP NOT NULL;
  ALTER TABLE "membership_applications" ALTER COLUMN "address_country" DROP NOT NULL;
  ALTER TABLE "members" ALTER COLUMN "email" DROP NOT NULL;
  ALTER TABLE "members" ALTER COLUMN "address_street" DROP NOT NULL;
  ALTER TABLE "members" ALTER COLUMN "address_postal_code" DROP NOT NULL;
  ALTER TABLE "members" ALTER COLUMN "address_city" DROP NOT NULL;
  ALTER TABLE "members" ALTER COLUMN "address_country" DROP NOT NULL;
  ALTER TABLE "membership_applications" ADD COLUMN "personal_data_moved_on" timestamp(3) with time zone;
  ALTER TABLE "members" ADD COLUMN "review_due_on" timestamp(3) with time zone;
  ALTER TABLE "members" ADD COLUMN "review_outcome" "enum_members_review_outcome";
  ALTER TABLE "members" ADD COLUMN "retain_until" timestamp(3) with time zone;
  ALTER TABLE "members" ADD COLUMN "retention_reason" "enum_members_retention_reason";
  ALTER TABLE "members" ADD COLUMN "retention_note" varchar;
  ALTER TABLE "members" ADD COLUMN "reviewed_on" timestamp(3) with time zone;
  ALTER TABLE "members" ADD COLUMN "reviewed_by_name" varchar;
  ALTER TABLE "members" ADD COLUMN "contact_data_removed_on" timestamp(3) with time zone;
  ALTER TABLE "control_center_settings" ADD COLUMN "reminders_member_review_days" numeric DEFAULT 0 NOT NULL;
  CREATE INDEX "members_review_due_on_idx" ON "members" USING btree ("review_due_on");`)

  // The person's fields may only be empty once they were moved to the register (applications)
  // or removed after the review (members); the database enforces it, also for direct SQL.
  await db.execute(sql`
  ALTER TABLE "membership_applications" ADD CONSTRAINT "membership_applications_person_present"
    CHECK ("personal_data_moved_on" IS NOT NULL OR ("first_name" IS NOT NULL AND "last_name" IS NOT NULL
      AND "email" IS NOT NULL AND "address_street" IS NOT NULL AND "address_postal_code" IS NOT NULL
      AND "address_city" IS NOT NULL AND "address_country" IS NOT NULL));
  ALTER TABLE "members" ADD CONSTRAINT "members_contact_present"
    CHECK ("contact_data_removed_on" IS NOT NULL OR ("email" IS NOT NULL AND "address_street" IS NOT NULL
      AND "address_postal_code" IS NOT NULL AND "address_city" IS NOT NULL AND "address_country" IS NOT NULL));`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Values the older schema does not know. (Moved or removed personal data cannot come back:
  // going down needs a database without such entries, or a restore of the backup made before.)
  await db.execute(sql`
  ALTER TABLE "membership_applications" DROP CONSTRAINT IF EXISTS "membership_applications_person_present";
  ALTER TABLE "members" DROP CONSTRAINT IF EXISTS "members_contact_present";
  UPDATE "case_events" SET "event" = 'member.updated' WHERE "event" IN ('member.reviewed', 'application.moved');
  DELETE FROM "notifications" WHERE "kind" IN ('memberReviewDue', 'memberReduced');
  DELETE FROM "payload_jobs" WHERE "task_slug" = 'notifications-retention';
  DELETE FROM "payload_jobs_log" WHERE "task_slug" = 'notifications-retention';`)
  await db.execute(sql`
   ALTER TABLE "case_events" ALTER COLUMN "event" SET DATA TYPE text;
  DROP TYPE "public"."enum_case_events_event";
  CREATE TYPE "public"."enum_case_events_event" AS ENUM('application.received', 'application.status', 'application.consent', 'application.assigned', 'application.followUp', 'member.created', 'member.updated', 'member.ended', 'member.reactivated');
  ALTER TABLE "case_events" ALTER COLUMN "event" SET DATA TYPE "public"."enum_case_events_event" USING "event"::"public"."enum_case_events_event";
  ALTER TABLE "notifications" ALTER COLUMN "kind" SET DATA TYPE text;
  DROP TYPE "public"."enum_notifications_kind";
  CREATE TYPE "public"."enum_notifications_kind" AS ENUM('newApplication', 'newMessage', 'assigned', 'followUpDue', 'applicationWaiting', 'consentPending', 'exportCreated', 'memberDeleted', 'newDevice');
  ALTER TABLE "notifications" ALTER COLUMN "kind" SET DATA TYPE "public"."enum_notifications_kind" USING "kind"::"public"."enum_notifications_kind";
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'retention', 'auth-cleanup', 'audit-retention', 'membership-reminders');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'retention', 'auth-cleanup', 'audit-retention', 'membership-reminders');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "members_review_due_on_idx";
  ALTER TABLE "membership_applications" ALTER COLUMN "first_name" SET NOT NULL;
  ALTER TABLE "membership_applications" ALTER COLUMN "last_name" SET NOT NULL;
  ALTER TABLE "membership_applications" ALTER COLUMN "email" SET NOT NULL;
  ALTER TABLE "membership_applications" ALTER COLUMN "address_street" SET NOT NULL;
  ALTER TABLE "membership_applications" ALTER COLUMN "address_postal_code" SET NOT NULL;
  ALTER TABLE "membership_applications" ALTER COLUMN "address_city" SET NOT NULL;
  ALTER TABLE "membership_applications" ALTER COLUMN "address_country" SET NOT NULL;
  ALTER TABLE "members" ALTER COLUMN "email" SET NOT NULL;
  ALTER TABLE "members" ALTER COLUMN "address_street" SET NOT NULL;
  ALTER TABLE "members" ALTER COLUMN "address_postal_code" SET NOT NULL;
  ALTER TABLE "members" ALTER COLUMN "address_city" SET NOT NULL;
  ALTER TABLE "members" ALTER COLUMN "address_country" SET NOT NULL;
  ALTER TABLE "membership_applications" DROP COLUMN "personal_data_moved_on";
  ALTER TABLE "members" DROP COLUMN "review_due_on";
  ALTER TABLE "members" DROP COLUMN "review_outcome";
  ALTER TABLE "members" DROP COLUMN "retain_until";
  ALTER TABLE "members" DROP COLUMN "retention_reason";
  ALTER TABLE "members" DROP COLUMN "retention_note";
  ALTER TABLE "members" DROP COLUMN "reviewed_on";
  ALTER TABLE "members" DROP COLUMN "reviewed_by_name";
  ALTER TABLE "members" DROP COLUMN "contact_data_removed_on";
  ALTER TABLE "control_center_settings" DROP COLUMN "reminders_member_review_days";
  DROP TYPE "public"."enum_members_review_outcome";
  DROP TYPE "public"."enum_members_retention_reason";`)
}
