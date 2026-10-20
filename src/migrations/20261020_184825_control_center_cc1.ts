import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_members_membership_type" AS ENUM('ordinary', 'supporting');
  CREATE TYPE "public"."enum_members_status" AS ENUM('active', 'ended');
  CREATE TYPE "public"."enum_members_source" AS ENUM('application', 'manual');
  CREATE TYPE "public"."enum_case_events_event" AS ENUM('application.received', 'application.status', 'application.consent', 'application.assigned', 'application.followUp', 'member.created', 'member.updated', 'member.ended', 'member.reactivated');
  CREATE TYPE "public"."enum_exports_dataset" AS ENUM('applications', 'members');
  CREATE TYPE "public"."enum_notifications_kind" AS ENUM('newApplication', 'newMessage', 'assigned', 'followUpDue', 'applicationWaiting', 'consentPending', 'exportCreated', 'memberDeleted', 'newDevice');
  CREATE TYPE "public"."enum_notifications_subject_type" AS ENUM('membership-applications', 'members', 'contact-messages', 'exports', 'security');
  ALTER TYPE "public"."enum_membership_applications_status" ADD VALUE 'inReview' BEFORE 'accepted';
  ALTER TYPE "public"."enum_contact_messages_status" ADD VALUE 'closed';
  ALTER TYPE "public"."enum_users_restrictions" ADD VALUE 'members.read' BEFORE 'personalData.export';
  ALTER TYPE "public"."enum_users_restrictions" ADD VALUE 'members.write' BEFORE 'personalData.export';
  ALTER TYPE "public"."enum_users_restrictions" ADD VALUE 'members.delete' BEFORE 'personalData.export';
  ALTER TYPE "public"."enum_users_restrictions" ADD VALUE 'exports.review' BEFORE 'operations.read';
  ALTER TYPE "public"."enum_users_restrictions" ADD VALUE 'settings.manage' BEFORE 'operations.read';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'audit-retention';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'membership-reminders';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'audit-retention';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'membership-reminders';
  CREATE TABLE "members" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"address_street" varchar NOT NULL,
  	"address_postal_code" varchar NOT NULL,
  	"address_city" varchar NOT NULL,
  	"address_country" varchar NOT NULL,
  	"membership_type" "enum_members_membership_type" NOT NULL,
  	"minor_at_admission" boolean DEFAULT false,
  	"guardian_name" varchar,
  	"guardian_email" varchar,
  	"guardian_consent_received_at" timestamp(3) with time zone,
  	"status" "enum_members_status" DEFAULT 'active' NOT NULL,
  	"member_since" timestamp(3) with time zone NOT NULL,
  	"ended_on" timestamp(3) with time zone,
  	"source" "enum_members_source" DEFAULT 'manual',
  	"application_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "case_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event" "enum_case_events_event" NOT NULL,
  	"application_id" integer,
  	"member_id" integer,
  	"from" varchar,
  	"to" varchar,
  	"actor_id" numeric,
  	"actor_name" varchar,
  	"detail" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "exports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dataset" "enum_exports_dataset" NOT NULL,
  	"rows" numeric NOT NULL,
  	"purpose" varchar NOT NULL,
  	"legal_basis" varchar NOT NULL,
  	"columns" jsonb,
  	"filter" jsonb,
  	"actor_id" numeric,
  	"actor_name" varchar,
  	"actor_role" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "notifications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"recipient_id" integer NOT NULL,
  	"kind" "enum_notifications_kind" NOT NULL,
  	"subject_type" "enum_notifications_subject_type" NOT NULL,
  	"subject_id" varchar,
  	"href" varchar NOT NULL,
  	"read_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "control_center_settings_export_legal_bases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"de" varchar NOT NULL,
  	"en" varchar,
  	"ar" varchar
  );
  
  CREATE TABLE "control_center_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"reminders_waiting_days" numeric DEFAULT 7 NOT NULL,
  	"reminders_consent_days" numeric DEFAULT 14 NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "membership_applications" ADD COLUMN "assigned_to_id" integer;
  ALTER TABLE "membership_applications" ADD COLUMN "follow_up_on" timestamp(3) with time zone;
  ALTER TABLE "contact_messages" ADD COLUMN "assigned_to_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "members_id" integer;
  ALTER TABLE "members" ADD CONSTRAINT "members_application_id_membership_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."membership_applications"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "case_events" ADD CONSTRAINT "case_events_application_id_membership_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."membership_applications"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "case_events" ADD CONSTRAINT "case_events_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "control_center_settings_export_legal_bases" ADD CONSTRAINT "control_center_settings_export_legal_bases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."control_center_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "members_application_idx" ON "members" USING btree ("application_id");
  CREATE INDEX "members_updated_at_idx" ON "members" USING btree ("updated_at");
  CREATE INDEX "members_created_at_idx" ON "members" USING btree ("created_at");
  CREATE INDEX "case_events_event_idx" ON "case_events" USING btree ("event");
  CREATE INDEX "case_events_application_idx" ON "case_events" USING btree ("application_id");
  CREATE INDEX "case_events_member_idx" ON "case_events" USING btree ("member_id");
  CREATE INDEX "case_events_updated_at_idx" ON "case_events" USING btree ("updated_at");
  CREATE INDEX "case_events_created_at_idx" ON "case_events" USING btree ("created_at");
  CREATE INDEX "exports_actor_id_idx" ON "exports" USING btree ("actor_id");
  CREATE INDEX "exports_updated_at_idx" ON "exports" USING btree ("updated_at");
  CREATE INDEX "exports_created_at_idx" ON "exports" USING btree ("created_at");
  CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_id");
  CREATE INDEX "notifications_read_at_idx" ON "notifications" USING btree ("read_at");
  CREATE INDEX "notifications_updated_at_idx" ON "notifications" USING btree ("updated_at");
  CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");
  CREATE INDEX "control_center_settings_export_legal_bases_order_idx" ON "control_center_settings_export_legal_bases" USING btree ("_order");
  CREATE INDEX "control_center_settings_export_legal_bases_parent_id_idx" ON "control_center_settings_export_legal_bases" USING btree ("_parent_id");
  ALTER TABLE "membership_applications" ADD CONSTRAINT "membership_applications_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "membership_applications_assigned_to_idx" ON "membership_applications" USING btree ("assigned_to_id");
  CREATE INDEX "contact_messages_assigned_to_idx" ON "contact_messages" USING btree ("assigned_to_id");
  CREATE INDEX "payload_locked_documents_rels_members_id_idx" ON "payload_locked_documents_rels" USING btree ("members_id");
  -- Audit log and export register: append-only in the database. The only exception is the
  -- nightly retention purge (src/cms/jobs/audit-retention.ts), which sets yop.retention_purge for
  -- its own transaction; even then only rows older than the retention period can be deleted.
  CREATE OR REPLACE FUNCTION "audit_log_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    IF TG_OP = 'DELETE'
       AND current_setting('yop.retention_purge', true) = 'on'
       AND OLD.created_at < now() - make_interval(months => GREATEST(
         COALESCE(NULLIF(current_setting('yop.retention_months', true), '')::int, 12), 1))
    THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION '% is append-only: % is not allowed', TG_TABLE_NAME, TG_OP
      USING ERRCODE = 'insufficient_privilege';
  END $$;
  CREATE TRIGGER "exports_no_update_or_delete" BEFORE UPDATE OR DELETE ON "exports"
    FOR EACH ROW EXECUTE FUNCTION "audit_log_append_only"();
  CREATE TRIGGER "exports_no_truncate" BEFORE TRUNCATE ON "exports"
    FOR EACH STATEMENT EXECUTE FUNCTION "audit_log_append_only"();

  -- At least one active super administrator remains, also for two changes at the same moment:
  -- the advisory lock (the same key as the application's check, src/cms/lib/db.ts) makes them
  -- wait for each other, and the count runs after the other change has committed.
  CREATE FUNCTION "users_keep_super_admin"() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    IF OLD.role = 'superAdmin' AND COALESCE(OLD.disabled, false) = false AND (
         TG_OP = 'DELETE'
         OR NEW.role IS DISTINCT FROM 'superAdmin'
         OR COALESCE(NEW.disabled, false) = true
       ) THEN
      PERFORM pg_advisory_xact_lock(4242001);
      IF NOT EXISTS (
        SELECT 1 FROM "users"
        WHERE role = 'superAdmin' AND COALESCE(disabled, false) = false AND id <> OLD.id
      ) THEN
        RAISE EXCEPTION 'at least one active super administrator must remain'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END $$;
  CREATE TRIGGER "users_keep_super_admin" BEFORE UPDATE OR DELETE ON "users"
    FOR EACH ROW EXECUTE FUNCTION "users_keep_super_admin"();`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP TRIGGER "users_keep_super_admin" ON "users";
  DROP FUNCTION "users_keep_super_admin"();
  DROP TRIGGER "exports_no_update_or_delete" ON "exports";
  DROP TRIGGER "exports_no_truncate" ON "exports";
  CREATE OR REPLACE FUNCTION "audit_log_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    RAISE EXCEPTION 'audit_log is append-only: % is not allowed', TG_OP
      USING ERRCODE = 'insufficient_privilege';
  END $$;
  DELETE FROM "users_restrictions"
    WHERE "value" IN ('members.read', 'members.write', 'members.delete', 'exports.review', 'settings.manage');
   ALTER TABLE "members" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "case_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "exports" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "notifications" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "control_center_settings_export_legal_bases" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "control_center_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "members" CASCADE;
  DROP TABLE "case_events" CASCADE;
  DROP TABLE "exports" CASCADE;
  DROP TABLE "notifications" CASCADE;
  DROP TABLE "control_center_settings_export_legal_bases" CASCADE;
  DROP TABLE "control_center_settings" CASCADE;
  ALTER TABLE "membership_applications" DROP CONSTRAINT "membership_applications_assigned_to_id_users_id_fk";
  
  ALTER TABLE "contact_messages" DROP CONSTRAINT "contact_messages_assigned_to_id_users_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_members_fk";
  
  ALTER TABLE "membership_applications" ALTER COLUMN "status" SET DATA TYPE text;
  UPDATE "membership_applications" SET "status" = 'received' WHERE "status" = 'inReview';
  ALTER TABLE "membership_applications" ALTER COLUMN "status" SET DEFAULT 'received'::text;
  DROP TYPE "public"."enum_membership_applications_status";
  CREATE TYPE "public"."enum_membership_applications_status" AS ENUM('received', 'accepted', 'rejected');
  ALTER TABLE "membership_applications" ALTER COLUMN "status" SET DEFAULT 'received'::"public"."enum_membership_applications_status";
  ALTER TABLE "membership_applications" ALTER COLUMN "status" SET DATA TYPE "public"."enum_membership_applications_status" USING "status"::"public"."enum_membership_applications_status";
  ALTER TABLE "contact_messages" ALTER COLUMN "status" SET DATA TYPE text;
  UPDATE "contact_messages" SET "status" = 'answered' WHERE "status" = 'closed';
  ALTER TABLE "contact_messages" ALTER COLUMN "status" SET DEFAULT 'new'::text;
  DROP TYPE "public"."enum_contact_messages_status";
  CREATE TYPE "public"."enum_contact_messages_status" AS ENUM('new', 'answered');
  ALTER TABLE "contact_messages" ALTER COLUMN "status" SET DEFAULT 'new'::"public"."enum_contact_messages_status";
  ALTER TABLE "contact_messages" ALTER COLUMN "status" SET DATA TYPE "public"."enum_contact_messages_status" USING "status"::"public"."enum_contact_messages_status";
  ALTER TABLE "users_restrictions" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_restrictions";
  CREATE TYPE "public"."enum_users_restrictions" AS ENUM('content.read', 'content.write', 'inbox.read', 'inbox.write', 'applications.delete', 'messages.delete', 'personalData.export', 'operations.read', 'operations.act', 'email.manage', 'jobs.run', 'users.read', 'users.manage', 'users.manageLimited', 'audit.read');
  ALTER TABLE "users_restrictions" ALTER COLUMN "value" SET DATA TYPE "public"."enum_users_restrictions" USING "value"::"public"."enum_users_restrictions";
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'retention', 'auth-cleanup');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'retention', 'auth-cleanup');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "membership_applications_assigned_to_idx";
  DROP INDEX "contact_messages_assigned_to_idx";
  DROP INDEX "payload_locked_documents_rels_members_id_idx";
  ALTER TABLE "membership_applications" DROP COLUMN "assigned_to_id";
  ALTER TABLE "membership_applications" DROP COLUMN "follow_up_on";
  ALTER TABLE "contact_messages" DROP COLUMN "assigned_to_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "members_id";
  DROP TYPE "public"."enum_members_membership_type";
  DROP TYPE "public"."enum_members_status";
  DROP TYPE "public"."enum_members_source";
  DROP TYPE "public"."enum_case_events_event";
  DROP TYPE "public"."enum_exports_dataset";
  DROP TYPE "public"."enum_notifications_kind";
  DROP TYPE "public"."enum_notifications_subject_type";`)
}
