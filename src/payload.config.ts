import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { s3Storage } from '@payloadcms/storage-s3'
import { ar } from '@payloadcms/translations/languages/ar'
import { de } from '@payloadcms/translations/languages/de'
import { en } from '@payloadcms/translations/languages/en'
import { buildConfig, defaultLoggerOptions, type CollectionConfig } from 'payload'
import sharp from 'sharp'

import type { AuditArea } from './cms/access/permissions'
import { allowed } from './cms/access/roles'
import { auditCollection, auditGlobal } from './cms/audit/log'
import { AuditLog } from './cms/collections/AuditLog'
import { AuthCredentials, AuthSessions, TrustedDevices } from './cms/collections/AuthSecurity'
import { CaseEvents } from './cms/collections/CaseEvents'
import { ContactMessages } from './cms/collections/ContactMessages'
import { Exports } from './cms/collections/Exports'
import { FocusAreas } from './cms/collections/FocusAreas'
import { Media } from './cms/collections/Media'
import { Members } from './cms/collections/Members'
import { MembershipApplications } from './cms/collections/MembershipApplications'
import { News } from './cms/collections/News'
import { Notifications } from './cms/collections/Notifications'
import { Partners } from './cms/collections/Partners'
import { Projects } from './cms/collections/Projects'
import { RateLimitBuckets } from './cms/collections/RateLimitBuckets'
import { Statistics } from './cms/collections/Statistics'
import { TeamMembers } from './cms/collections/TeamMembers'
import { Users } from './cms/collections/Users'
import { emailAdapter } from './cms/email'
import { richTextEditor } from './cms/fields/richText'
import { AboutPage } from './cms/globals/AboutPage'
import { ContactPage } from './cms/globals/ContactPage'
import { ControlCenterSettings } from './cms/globals/ControlCenterSettings'
import { HomePage } from './cms/globals/HomePage'
import { LegalNotice, PrivacyPolicy } from './cms/globals/LegalPages'
import { MembershipPage } from './cms/globals/MembershipPage'
import { SiteSettings } from './cms/globals/SiteSettings'
import { SupportPage } from './cms/globals/SupportPage'
import { auditRetentionTask } from './cms/jobs/audit-retention'
import { authCleanupTask } from './cms/jobs/auth-cleanup'
import { membershipRemindersTask } from './cms/jobs/membership-reminders'
import { retentionTask } from './cms/jobs/retention'
import { migrations } from './migrations'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const siteURL = process.env.SERVER_URL ?? ''
/**
 * Payload's own address is the Control Center's (its admin calls the API there); the website
 * keeps SERVER_URL. Media URLs are turned into same-origin paths by the website (CmsImage).
 */
const serverURL = process.env.ADMIN_URL || siteURL
const origins = [...new Set([siteURL, serverURL].filter(Boolean).map((url) => new URL(url).origin))]

/** Every change to content and association data goes into the audit log (src/cms/audit). */
function audited(collection: CollectionConfig, area: AuditArea, personalData = false) {
  const titleField = collection.admin?.useAsTitle
  const hooks = auditCollection(area, (doc) => {
    if (personalData || !titleField) return null
    const title = doc[titleField]
    return typeof title === 'string' ? title : null
  })
  return {
    ...collection,
    hooks: {
      ...collection.hooks,
      afterChange: [...(collection.hooks?.afterChange ?? []), hooks.afterChange],
      afterDelete: [...(collection.hooks?.afterDelete ?? []), hooks.afterDelete],
    },
  }
}

export default buildConfig({
  serverURL,
  secret: process.env.PAYLOAD_SECRET ?? '',
  telemetry: false,
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' – Youth of Peace Control Center' },
    // Day.month.year and 24-hour time in every admin language (Latin digits in Arabic too).
    dateFormat: 'dd.MM.yyyy, HH:mm',
    // Payload's default avatar is Gravatar, which sends a hash of each editor's e-mail address
    // to a third party (and is blocked by the CSP). A neutral icon instead.
    avatar: 'default',
    // The Control Center's own interface (src/cms/admin): sign-in with two factors, navigation,
    // dashboard and security screen in the website's design.
    components: {
      graphics: {
        Logo: '/cms/admin/brand/Brand#Logo',
        Icon: '/cms/admin/brand/Brand#Icon',
      },
      providers: ['/cms/admin/AdminProvider#AdminProvider'],
      Nav: '/cms/admin/nav/Nav#Nav',
      views: {
        login: { Component: '/cms/admin/sign-in/SignInView#SignInView' },
        dashboard: { Component: '/cms/admin/dashboard/Dashboard#Dashboard' },
        security: {
          Component: '/cms/admin/security/SecurityView#SecurityView',
          path: '/security',
          exact: true,
        },
        export: {
          Component: '/cms/admin/membership/ExportView#ExportView',
          path: '/export',
          exact: true,
        },
        notifications: {
          Component: '/cms/admin/notifications/NotificationsView#NotificationsView',
          path: '/notifications',
          exact: true,
        },
      },
      actions: ['/cms/admin/notifications/Bell#Bell'],
    },
  },
  collections: [
    audited(Projects, 'content'),
    audited(News, 'content'),
    audited(FocusAreas, 'content'),
    audited(TeamMembers, 'content'),
    audited(Statistics, 'content'),
    audited(Partners, 'content'),
    audited(Media, 'content'),
    audited(MembershipApplications, 'association', true),
    audited(ContactMessages, 'association', true),
    audited(Members, 'association', true),
    CaseEvents,
    Exports,
    Notifications,
    Users,
    AuditLog,
    AuthSessions,
    AuthCredentials,
    TrustedDevices,
    RateLimitBuckets,
  ],
  globals: [
    HomePage,
    AboutPage,
    MembershipPage,
    SupportPage,
    ContactPage,
    LegalNotice,
    PrivacyPolicy,
    SiteSettings,
    ControlCenterSettings,
  ].map((global) => ({
    ...global,
    hooks: { ...global.hooks, afterChange: [...(global.hooks?.afterChange ?? []), auditGlobal] },
  })),
  editor: richTextEditor,
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL ?? '' },
    // Schema changes always go through committed migrations, in development too.
    push: false,
    prodMigrations: migrations,
  }),
  graphQL: { disable: true },
  email: emailAdapter(),
  logger: {
    destination: defaultLoggerOptions,
    options: {
      level: process.env.LOG_LEVEL || 'info',
      hooks: {
        // Payload logs refused requests (403, 404, validation) as errors; they are normal traffic.
        // Its own setting for this matches error class names, which the production build minifies.
        logMethod(args, method, level) {
          const err = (args[0] as { err?: { status?: unknown; message?: string } } | undefined)?.err
          if (level >= 50 && typeof err?.status === 'number' && err.status < 500) {
            return this.info({ status: err.status }, err.message ?? 'Request refused')
          }
          return method.apply(this, args)
        },
      },
    },
  },
  jobs: {
    tasks: [retentionTask, authCleanupTask, auditRetentionTask, membershipRemindersTask],
    // Checks the queue every 10 minutes; the tasks' own schedules decide when they are due.
    autoRun: [{ cron: '*/10 * * * *', queue: 'maintenance' }],
    access: { run: ({ req }) => allowed(req, 'jobs.run') },
  },
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
  cors: origins,
  csrf: origins,
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
