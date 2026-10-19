import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { s3Storage } from '@payloadcms/storage-s3'
import { ar } from '@payloadcms/translations/languages/ar'
import { de } from '@payloadcms/translations/languages/de'
import { en } from '@payloadcms/translations/languages/en'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { FocusAreas } from './cms/collections/FocusAreas'
import { Media } from './cms/collections/Media'
import { News } from './cms/collections/News'
import { Partners } from './cms/collections/Partners'
import { Projects } from './cms/collections/Projects'
import { Statistics } from './cms/collections/Statistics'
import { TeamMembers } from './cms/collections/TeamMembers'
import { Users } from './cms/collections/Users'
import { richTextEditor } from './cms/fields/richText'
import { AboutPage } from './cms/globals/AboutPage'
import { ContactPage } from './cms/globals/ContactPage'
import { HomePage } from './cms/globals/HomePage'
import { LegalNotice, PrivacyPolicy } from './cms/globals/LegalPages'
import { MembershipPage } from './cms/globals/MembershipPage'
import { SiteSettings } from './cms/globals/SiteSettings'
import { SupportPage } from './cms/globals/SupportPage'
import { migrations } from './migrations'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const serverURL = process.env.SERVER_URL ?? ''

export default buildConfig({
  serverURL,
  secret: process.env.PAYLOAD_SECRET ?? '',
  telemetry: false,
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' – Youth of Peace e.V.' },
  },
  collections: [Projects, News, FocusAreas, TeamMembers, Statistics, Partners, Media, Users],
  globals: [
    HomePage,
    AboutPage,
    MembershipPage,
    SupportPage,
    ContactPage,
    LegalNotice,
    PrivacyPolicy,
    SiteSettings,
  ],
  editor: richTextEditor,
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL ?? '' },
    // Schema changes always go through committed migrations, in development too.
    push: false,
    prodMigrations: migrations,
  }),
  graphQL: { disable: true },
  localization: {
    locales: [
      { code: 'de', label: 'Deutsch' },
      { code: 'en', label: 'English' },
      { code: 'ar', label: 'العربية', rtl: true },
    ],
    defaultLocale: 'de',
    fallback: true,
  },
  i18n: {
    supportedLanguages: { de, en, ar },
    fallbackLanguage: 'de',
  },
  cors: serverURL ? [serverURL] : [],
  csrf: serverURL ? [serverURL] : [],
  upload: {
    limits: { fileSize: 10 * 1024 * 1024 },
  },
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  plugins: [
    // Media lives in S3-compatible storage (EU region in production, SeaweedFS in development).
    // Without S3_BUCKET (end-to-end tests) uploads go to the local MEDIA_DIR instead.
    s3Storage({
      enabled: Boolean(process.env.S3_BUCKET),
      // Same database schema with and without S3.
      alwaysInsertFields: true,
      collections: { media: true },
      bucket: process.env.S3_BUCKET ?? '',
      config: {
        endpoint: process.env.S3_ENDPOINT || undefined,
        region: process.env.S3_REGION ?? 'eu-central-1',
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
        },
      },
    }),
  ],
})
