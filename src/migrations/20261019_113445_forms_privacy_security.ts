import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_membership_applications_membership_type" AS ENUM('ordinary', 'supporting');
  CREATE TYPE "public"."enum_membership_applications_locale" AS ENUM('de', 'en', 'ar');
  CREATE TYPE "public"."enum_membership_applications_status" AS ENUM('received', 'accepted', 'rejected');
  CREATE TYPE "public"."enum_contact_messages_topic" AS ENUM('general', 'membership', 'volunteering', 'partnership', 'press', 'other');
  CREATE TYPE "public"."enum_contact_messages_locale" AS ENUM('de', 'en', 'ar');
  CREATE TYPE "public"."enum_contact_messages_status" AS ENUM('new', 'answered');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'retention');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'retention');
  CREATE TABLE "membership_applications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"address_street" varchar NOT NULL,
  	"address_postal_code" varchar NOT NULL,
  	"address_city" varchar NOT NULL,
  	"address_country" varchar NOT NULL,
  	"membership_type" "enum_membership_applications_membership_type" NOT NULL,
  	"declarations_at_least16" boolean DEFAULT false NOT NULL,
  	"declarations_principles" boolean DEFAULT false NOT NULL,
  	"declarations_fees" boolean DEFAULT false NOT NULL,
  	"under18" boolean DEFAULT false,
  	"guardian_name" varchar,
  	"guardian_email" varchar,
  	"guardian_consent_received_at" timestamp(3) with time zone,
  	"consent_given" boolean DEFAULT false NOT NULL,
  	"consent_at" timestamp(3) with time zone NOT NULL,
  	"consent_privacy_policy_version" varchar,
  	"consent_text" varchar,
  	"locale" "enum_membership_applications_locale" NOT NULL,
  	"status" "enum_membership_applications_status" DEFAULT 'received' NOT NULL,
  	"decision_date" timestamp(3) with time zone,
  	"decided_by_id" integer,
  	"internal_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "contact_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"topic" "enum_contact_messages_topic" NOT NULL,
  	"message" varchar NOT NULL,
  	"consent_given" boolean DEFAULT false NOT NULL,
  	"consent_at" timestamp(3) with time zone NOT NULL,
  	"consent_privacy_policy_version" varchar,
  	"consent_text" varchar,
  	"locale" "enum_contact_messages_locale" NOT NULL,
  	"status" "enum_contact_messages_status" DEFAULT 'new' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "rate_limit_buckets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"count" numeric DEFAULT 0 NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"meta" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_jobs_stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stats" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "membership_applications_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "contact_messages_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "rate_limit_buckets_id" integer;
  ALTER TABLE "membership_page_locales" ADD COLUMN "form_principles" varchar;
  ALTER TABLE "membership_page_locales" ADD COLUMN "form_fees" varchar;
  ALTER TABLE "membership_page_locales" ADD COLUMN "form_guardian" varchar;
  ALTER TABLE "membership_page_locales" ADD COLUMN "form_consent" varchar;
  ALTER TABLE "contact_page_locales" ADD COLUMN "form_consent" varchar;
  ALTER TABLE "membership_applications" ADD CONSTRAINT "membership_applications_decided_by_id_users_id_fk" FOREIGN KEY ("decided_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "membership_applications_decided_by_idx" ON "membership_applications" USING btree ("decided_by_id");
  CREATE INDEX "membership_applications_updated_at_idx" ON "membership_applications" USING btree ("updated_at");
  CREATE INDEX "membership_applications_created_at_idx" ON "membership_applications" USING btree ("created_at");
  CREATE INDEX "contact_messages_updated_at_idx" ON "contact_messages" USING btree ("updated_at");
  CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages" USING btree ("created_at");
  CREATE UNIQUE INDEX "rate_limit_buckets_key_idx" ON "rate_limit_buckets" USING btree ("key");
  CREATE INDEX "rate_limit_buckets_expires_at_idx" ON "rate_limit_buckets" USING btree ("expires_at");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_membership_applications_fk" FOREIGN KEY ("membership_applications_id") REFERENCES "public"."membership_applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contact_messages_fk" FOREIGN KEY ("contact_messages_id") REFERENCES "public"."contact_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rate_limit_buckets_fk" FOREIGN KEY ("rate_limit_buckets_id") REFERENCES "public"."rate_limit_buckets"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_membership_applications_id_idx" ON "payload_locked_documents_rels" USING btree ("membership_applications_id");
  CREATE INDEX "payload_locked_documents_rels_contact_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("contact_messages_id");
  CREATE INDEX "payload_locked_documents_rels_rate_limit_buckets_id_idx" ON "payload_locked_documents_rels" USING btree ("rate_limit_buckets_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "membership_applications" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contact_messages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "rate_limit_buckets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs_stats" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "membership_applications" CASCADE;
  DROP TABLE "contact_messages" CASCADE;
  DROP TABLE "rate_limit_buckets" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_jobs_stats" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_membership_applications_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_contact_messages_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_rate_limit_buckets_fk";
  
  DROP INDEX "payload_locked_documents_rels_membership_applications_id_idx";
  DROP INDEX "payload_locked_documents_rels_contact_messages_id_idx";
  DROP INDEX "payload_locked_documents_rels_rate_limit_buckets_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "membership_applications_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "contact_messages_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "rate_limit_buckets_id";
  ALTER TABLE "membership_page_locales" DROP COLUMN "form_principles";
  ALTER TABLE "membership_page_locales" DROP COLUMN "form_fees";
  ALTER TABLE "membership_page_locales" DROP COLUMN "form_guardian";
  ALTER TABLE "membership_page_locales" DROP COLUMN "form_consent";
  ALTER TABLE "contact_page_locales" DROP COLUMN "form_consent";
  DROP TYPE "public"."enum_membership_applications_membership_type";
  DROP TYPE "public"."enum_membership_applications_locale";
  DROP TYPE "public"."enum_membership_applications_status";
  DROP TYPE "public"."enum_contact_messages_topic";
  DROP TYPE "public"."enum_contact_messages_locale";
  DROP TYPE "public"."enum_contact_messages_status";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";`)
}
