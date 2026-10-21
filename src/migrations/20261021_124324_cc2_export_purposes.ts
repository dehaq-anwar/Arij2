import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { LEGAL_BASES } from '../cms/membership/legal-bases'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_processing_purposes_columns" AS ENUM('firstName', 'lastName', 'email', 'street', 'postalCode', 'city', 'country', 'membershipType', 'status', 'receivedOn', 'decisionDate', 'under18', 'guardianName', 'guardianEmail', 'guardianConsent', 'memberSince', 'endedOn', 'minorAtAdmission');
  CREATE TYPE "public"."enum_processing_purposes_dataset" AS ENUM('applications', 'members');
  CREATE TYPE "public"."enum_processing_purposes_status" AS ENUM('draft', 'approved', 'retired');
  CREATE TYPE "public"."enum_legal_bases_code" AS ENUM('a', 'b', 'c', 'd', 'e', 'f');
  CREATE TABLE "processing_purposes_columns" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_processing_purposes_columns",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "processing_purposes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dataset" "enum_processing_purposes_dataset" NOT NULL,
  	"legal_basis_id" integer NOT NULL,
  	"justification" varchar NOT NULL,
  	"status" "enum_processing_purposes_status" DEFAULT 'draft' NOT NULL,
  	"decision_reference" varchar,
  	"approved_on" timestamp(3) with time zone,
  	"approved_by_name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "processing_purposes_locales" (
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "legal_bases" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" "enum_legal_bases_code" NOT NULL,
  	"available" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "legal_bases_locales" (
  	"title" varchar NOT NULL,
  	"article" varchar NOT NULL,
  	"wording" varchar NOT NULL,
  	"explanation" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "control_center_settings_export_legal_bases" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "control_center_settings_export_legal_bases" CASCADE;
  ALTER TABLE "exports" ADD COLUMN "processing_purpose_id" integer;
  ALTER TABLE "exports" ADD COLUMN "processing_purpose_name" varchar;
  ALTER TABLE "exports" ADD COLUMN "legal_basis_code" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "processing_purposes_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "legal_bases_id" integer;
  ALTER TABLE "processing_purposes_columns" ADD CONSTRAINT "processing_purposes_columns_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."processing_purposes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_purposes" ADD CONSTRAINT "processing_purposes_legal_basis_id_legal_bases_id_fk" FOREIGN KEY ("legal_basis_id") REFERENCES "public"."legal_bases"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "processing_purposes_locales" ADD CONSTRAINT "processing_purposes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_purposes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legal_bases_locales" ADD CONSTRAINT "legal_bases_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legal_bases"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "processing_purposes_columns_order_idx" ON "processing_purposes_columns" USING btree ("order");
  CREATE INDEX "processing_purposes_columns_parent_idx" ON "processing_purposes_columns" USING btree ("parent_id");
  CREATE INDEX "processing_purposes_legal_basis_idx" ON "processing_purposes" USING btree ("legal_basis_id");
  CREATE INDEX "processing_purposes_status_idx" ON "processing_purposes" USING btree ("status");
  CREATE INDEX "processing_purposes_updated_at_idx" ON "processing_purposes" USING btree ("updated_at");
  CREATE INDEX "processing_purposes_created_at_idx" ON "processing_purposes" USING btree ("created_at");
  CREATE UNIQUE INDEX "processing_purposes_locales_locale_parent_id_unique" ON "processing_purposes_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "legal_bases_code_idx" ON "legal_bases" USING btree ("code");
  CREATE INDEX "legal_bases_updated_at_idx" ON "legal_bases" USING btree ("updated_at");
  CREATE INDEX "legal_bases_created_at_idx" ON "legal_bases" USING btree ("created_at");
  CREATE UNIQUE INDEX "legal_bases_locales_locale_parent_id_unique" ON "legal_bases_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "exports" ADD CONSTRAINT "exports_processing_purpose_id_processing_purposes_id_fk" FOREIGN KEY ("processing_purpose_id") REFERENCES "public"."processing_purposes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_processing_purposes_fk" FOREIGN KEY ("processing_purposes_id") REFERENCES "public"."processing_purposes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_legal_bases_fk" FOREIGN KEY ("legal_bases_id") REFERENCES "public"."legal_bases"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "exports_processing_purpose_idx" ON "exports" USING btree ("processing_purpose_id");
  CREATE INDEX "payload_locked_documents_rels_processing_purposes_id_idx" ON "payload_locked_documents_rels" USING btree ("processing_purposes_id");
  CREATE INDEX "payload_locked_documents_rels_legal_bases_id_idx" ON "payload_locked_documents_rels" USING btree ("legal_bases_id");`)

  // The six legal bases of Art. 6(1) GDPR, in German, English and Arabic (an unofficial
  // translation). The free-text list of CC-1 (control-center-settings) is replaced by them; it
  // was never used in production. No purpose exists yet, so exports stay off until the
  // association approves one.
  for (const basis of LEGAL_BASES) {
    const doc = await payload.create({
      collection: 'legal-bases',
      locale: 'de',
      data: {
        code: basis.code,
        title: basis.title.de,
        article: basis.article.de,
        wording: basis.wording.de,
        explanation: basis.explanation.de,
        available: true,
      },
      context: { disableRevalidate: true },
      req,
    })
    for (const locale of ['en', 'ar'] as const) {
      await payload.update({
        collection: 'legal-bases',
        id: doc.id,
        locale,
        data: {
          title: basis.title[locale],
          article: basis.article[locale],
          wording: basis.wording[locale],
          explanation: basis.explanation[locale],
        },
        context: { disableRevalidate: true },
        req,
      })
    }
  }
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "control_center_settings_export_legal_bases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"de" varchar NOT NULL,
  	"en" varchar,
  	"ar" varchar
  );
  
  ALTER TABLE "processing_purposes_columns" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_purposes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_purposes_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "legal_bases" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "legal_bases_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "processing_purposes_columns" CASCADE;
  DROP TABLE "processing_purposes" CASCADE;
  DROP TABLE "processing_purposes_locales" CASCADE;
  DROP TABLE "legal_bases" CASCADE;
  DROP TABLE "legal_bases_locales" CASCADE;
  ALTER TABLE "exports" DROP CONSTRAINT IF EXISTS "exports_processing_purpose_id_processing_purposes_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_processing_purposes_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_legal_bases_fk";
  
  DROP INDEX "exports_processing_purpose_idx";
  DROP INDEX "payload_locked_documents_rels_processing_purposes_id_idx";
  DROP INDEX "payload_locked_documents_rels_legal_bases_id_idx";
  ALTER TABLE "control_center_settings_export_legal_bases" ADD CONSTRAINT "control_center_settings_export_legal_bases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."control_center_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "control_center_settings_export_legal_bases_order_idx" ON "control_center_settings_export_legal_bases" USING btree ("_order");
  CREATE INDEX "control_center_settings_export_legal_bases_parent_id_idx" ON "control_center_settings_export_legal_bases" USING btree ("_parent_id");
  ALTER TABLE "exports" DROP COLUMN "processing_purpose_id";
  ALTER TABLE "exports" DROP COLUMN "processing_purpose_name";
  ALTER TABLE "exports" DROP COLUMN "legal_basis_code";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "processing_purposes_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "legal_bases_id";
  DROP TYPE "public"."enum_processing_purposes_columns";
  DROP TYPE "public"."enum_processing_purposes_dataset";
  DROP TYPE "public"."enum_processing_purposes_status";
  DROP TYPE "public"."enum_legal_bases_code";`)
}
