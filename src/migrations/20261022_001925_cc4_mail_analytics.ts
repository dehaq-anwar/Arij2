import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_users_restrictions" ADD VALUE 'analytics.read' BEFORE 'jobs.run';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'analytics-collect' BEFORE 'schedulePublish';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'analytics-collect' BEFORE 'schedulePublish';
  CREATE TABLE "access_stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hour" timestamp(3) with time zone NOT NULL,
  	"requests" numeric DEFAULT 0 NOT NULL,
  	"views" numeric DEFAULT 0 NOT NULL,
  	"entrances" numeric DEFAULT 0 NOT NULL,
  	"bots" numeric DEFAULT 0 NOT NULL,
  	"not_found" numeric DEFAULT 0 NOT NULL,
  	"server_errors" numeric DEFAULT 0 NOT NULL,
  	"pages" jsonb,
  	"referrers" jsonb,
  	"not_found_paths" jsonb,
  	"errors" jsonb
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "access_stats_id" integer;
  CREATE UNIQUE INDEX "access_stats_hour_idx" ON "access_stats" USING btree ("hour");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_access_stats_fk" FOREIGN KEY ("access_stats_id") REFERENCES "public"."access_stats"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_access_stats_id_idx" ON "payload_locked_documents_rels" USING btree ("access_stats_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "access_stats" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "access_stats" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_access_stats_fk";
  
  ALTER TABLE "users_restrictions" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_restrictions";
  CREATE TYPE "public"."enum_users_restrictions" AS ENUM('content.read', 'content.write', 'inbox.read', 'inbox.write', 'applications.delete', 'messages.delete', 'members.read', 'members.write', 'members.delete', 'personalData.export', 'exports.review', 'settings.manage', 'operations.read', 'operations.act', 'email.manage', 'jobs.run', 'users.read', 'users.manage', 'users.manageLimited', 'audit.read');
  ALTER TABLE "users_restrictions" ALTER COLUMN "value" SET DATA TYPE "public"."enum_users_restrictions" USING "value"::"public"."enum_users_restrictions";
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'retention', 'auth-cleanup', 'audit-retention', 'membership-reminders', 'notifications-retention', 'ops-collect', 'ops-retention', 'schedulePublish');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'retention', 'auth-cleanup', 'audit-retention', 'membership-reminders', 'notifications-retention', 'ops-collect', 'ops-retention', 'schedulePublish');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "payload_locked_documents_rels_access_stats_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "access_stats_id";`)
}
