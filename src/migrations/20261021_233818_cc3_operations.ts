import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_ops_events_kind" AS ENUM('backup', 'drill', 'restart');
  CREATE TYPE "public"."enum_ops_events_trigger" AS ENUM('schedule', 'manual');
  CREATE TYPE "public"."enum_email_log_template" AS ENUM('newApplication', 'newMessage', 'passwordReset', 'securityNotice', 'alert', 'test', 'other');
  CREATE TYPE "public"."enum_email_log_status" AS ENUM('sent', 'failed', 'notConfigured');
  ALTER TYPE "public"."enum_notifications_kind" ADD VALUE 'opsAgentUnreachable';
  ALTER TYPE "public"."enum_notifications_kind" ADD VALUE 'opsServiceDown';
  ALTER TYPE "public"."enum_notifications_kind" ADD VALUE 'opsBackupFailed';
  ALTER TYPE "public"."enum_notifications_kind" ADD VALUE 'opsBackupOverdue';
  ALTER TYPE "public"."enum_notifications_kind" ADD VALUE 'opsDrillFailed';
  ALTER TYPE "public"."enum_notifications_kind" ADD VALUE 'opsRestartFailed';
  ALTER TYPE "public"."enum_notifications_kind" ADD VALUE 'opsCertificate';
  ALTER TYPE "public"."enum_notifications_kind" ADD VALUE 'opsDiskFull';
  ALTER TYPE "public"."enum_notifications_kind" ADD VALUE 'emailFailed';
  ALTER TYPE "public"."enum_notifications_subject_type" ADD VALUE 'operations';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'ops-collect' BEFORE 'schedulePublish';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'ops-retention' BEFORE 'schedulePublish';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'ops-collect' BEFORE 'schedulePublish';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'ops-retention' BEFORE 'schedulePublish';
  CREATE TABLE "ops_samples" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone NOT NULL,
  	"cpu_percent" numeric,
  	"memory_used" numeric,
  	"memory_total" numeric,
  	"load1" numeric,
  	"disk_used" numeric,
  	"disk_total" numeric,
  	"database_bytes" numeric
  );
  
  CREATE TABLE "ops_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" varchar NOT NULL,
  	"kind" "enum_ops_events_kind" NOT NULL,
  	"trigger" "enum_ops_events_trigger" NOT NULL,
  	"started_at" timestamp(3) with time zone NOT NULL,
  	"finished_at" timestamp(3) with time zone NOT NULL,
  	"ok" boolean DEFAULT false NOT NULL,
  	"detail" jsonb
  );
  
  CREATE TABLE "email_log" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"template" "enum_email_log_template" NOT NULL,
  	"recipient" varchar NOT NULL,
  	"status" "enum_email_log_status" NOT NULL,
  	"error_code" varchar,
  	"duration_ms" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "email_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"smtp_host" varchar,
  	"smtp_port" numeric,
  	"smtp_user" varchar,
  	"smtp_from_address" varchar,
  	"smtp_from_name" varchar,
  	"addresses_notify" varchar,
  	"addresses_technical" varchar,
  	"domain_name" varchar,
  	"domain_dkim_selector" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "operations_state" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"last_contact_at" timestamp(3) with time zone,
  	"last_attempt_at" timestamp(3) with time zone,
  	"last_error" varchar,
  	"failing_since" timestamp(3) with time zone,
  	"last_sample_at" timestamp(3) with time zone,
  	"last_event_at" varchar,
  	"status" jsonb,
  	"certificates" jsonb,
  	"certificates_checked_at" timestamp(3) with time zone,
  	"database" jsonb,
  	"access_collected_until" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ops_samples_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ops_events_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "email_log_id" integer;
  CREATE UNIQUE INDEX "ops_samples_at_idx" ON "ops_samples" USING btree ("at");
  CREATE UNIQUE INDEX "ops_events_event_id_idx" ON "ops_events" USING btree ("event_id");
  CREATE INDEX "ops_events_kind_idx" ON "ops_events" USING btree ("kind");
  CREATE INDEX "ops_events_started_at_idx" ON "ops_events" USING btree ("started_at");
  CREATE INDEX "email_log_template_idx" ON "email_log" USING btree ("template");
  CREATE INDEX "email_log_status_idx" ON "email_log" USING btree ("status");
  CREATE INDEX "email_log_updated_at_idx" ON "email_log" USING btree ("updated_at");
  CREATE INDEX "email_log_created_at_idx" ON "email_log" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ops_samples_fk" FOREIGN KEY ("ops_samples_id") REFERENCES "public"."ops_samples"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ops_events_fk" FOREIGN KEY ("ops_events_id") REFERENCES "public"."ops_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_email_log_fk" FOREIGN KEY ("email_log_id") REFERENCES "public"."email_log"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_ops_samples_id_idx" ON "payload_locked_documents_rels" USING btree ("ops_samples_id");
  CREATE INDEX "payload_locked_documents_rels_ops_events_id_idx" ON "payload_locked_documents_rels" USING btree ("ops_events_id");
  CREATE INDEX "payload_locked_documents_rels_email_log_id_idx" ON "payload_locked_documents_rels" USING btree ("email_log_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ops_samples" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ops_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "email_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "email_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "operations_state" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "ops_samples" CASCADE;
  DROP TABLE "ops_events" CASCADE;
  DROP TABLE "email_log" CASCADE;
  DROP TABLE "email_settings" CASCADE;
  DROP TABLE "operations_state" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_ops_samples_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_ops_events_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_email_log_fk";
  
  ALTER TABLE "notifications" ALTER COLUMN "kind" SET DATA TYPE text;
  DROP TYPE "public"."enum_notifications_kind";
  CREATE TYPE "public"."enum_notifications_kind" AS ENUM('newApplication', 'newMessage', 'assigned', 'followUpDue', 'applicationWaiting', 'consentPending', 'exportCreated', 'memberDeleted', 'newDevice', 'memberReviewDue', 'memberReduced');
  ALTER TABLE "notifications" ALTER COLUMN "kind" SET DATA TYPE "public"."enum_notifications_kind" USING "kind"::"public"."enum_notifications_kind";
  ALTER TABLE "notifications" ALTER COLUMN "subject_type" SET DATA TYPE text;
  DROP TYPE "public"."enum_notifications_subject_type";
  CREATE TYPE "public"."enum_notifications_subject_type" AS ENUM('membership-applications', 'members', 'contact-messages', 'exports', 'security');
  ALTER TABLE "notifications" ALTER COLUMN "subject_type" SET DATA TYPE "public"."enum_notifications_subject_type" USING "subject_type"::"public"."enum_notifications_subject_type";
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'retention', 'auth-cleanup', 'audit-retention', 'membership-reminders', 'notifications-retention', 'schedulePublish');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'retention', 'auth-cleanup', 'audit-retention', 'membership-reminders', 'notifications-retention', 'schedulePublish');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "payload_locked_documents_rels_ops_samples_id_idx";
  DROP INDEX "payload_locked_documents_rels_ops_events_id_idx";
  DROP INDEX "payload_locked_documents_rels_email_log_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ops_samples_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ops_events_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "email_log_id";
  DROP TYPE "public"."enum_ops_events_kind";
  DROP TYPE "public"."enum_ops_events_trigger";
  DROP TYPE "public"."enum_email_log_template";
  DROP TYPE "public"."enum_email_log_status";`)
}
