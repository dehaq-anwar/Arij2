import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { s3Storage } from '@payloadcms/storage-s3'
import { ar } from '@payloadcms/translations/languages/ar'
import { de } from '@payloadcms/translations/languages/de'
import { en } from '@payloadcms/translations/languages/en'
import {
  buildConfig,
  defaultLoggerOptions,
  type CollectionConfig,
  type GlobalConfig,
} from 'payload'
import sharp from 'sharp'

import type { AuditArea } from './cms/access/permissions'
import { allowed } from './cms/access/roles'
import { auditCollection, auditGlobal } from './cms/audit/log'
import { AuditLog } from './cms/collections/AuditLog'
import { AuthCredentials, AuthSessions, TrustedDevices } from './cms/collections/AuthSecurity'
import { CaseEvents } from './cms/collections/CaseEvents'
import { ContactMessages } from './cms/collections/ContactMessages'
import { Events } from './cms/collections/Events'
import { Exports } from './cms/collections/Exports'
import { FocusAreas } from './cms/collections/FocusAreas'
import { LegalBases } from './cms/collections/LegalBases'
import { Media } from './cms/collections/Media'
import { Members } from './cms/collections/Members'
import { MembershipApplications } from './cms/collections/MembershipApplications'
import { News } from './cms/collections/News'
import { Pages } from './cms/collections/Pages'
import { Notifications } from './cms/collections/Notifications'
import { OperationsState, OpsEvents, OpsSamples } from './cms/collections/Operations'
import { Partners } from './cms/collections/Partners'
import { ProcessingPurposes } from './cms/collections/ProcessingPurposes'
import { Projects } from './cms/collections/Projects'
import { RateLimitBuckets } from './cms/collections/RateLimitBuckets'
import { Redirects } from './cms/collections/Redirects'
import { Statistics } from './cms/collections/Statistics'
import { TeamMembers } from './cms/collections/TeamMembers'
import { Users } from './cms/collections/Users'
import { emailAdapter } from './cms/email'
import { richTextEditor } from './cms/fields/richText'
import { AboutPage } from './cms/globals/AboutPage'
import { ContactPage } from './cms/globals/ContactPage'
import { ControlCenterSettings } from './cms/globals/ControlCenterSettings'
import { ensureFormTexts, FormTexts } from './cms/globals/FormTexts'
import { HomePage } from './cms/globals/HomePage'
import { LegalNotice, PrivacyPolicy } from './cms/globals/LegalPages'
import { MembershipPage } from './cms/globals/MembershipPage'
import { ensureNavigation, Navigation } from './cms/globals/Navigation'
import { SiteSettings } from './cms/globals/SiteSettings'
import { SupportPage } from './cms/globals/SupportPage'
import { auditRetentionTask } from './cms/jobs/audit-retention'
import { authCleanupTask } from './cms/jobs/auth-cleanup'
import { membershipRemindersTask } from './cms/jobs/membership-reminders'
import { notificationsRetentionTask } from './cms/jobs/notifications-retention'
import { retentionTask } from './cms/jobs/retention'
import { withCheckedSchedule } from './cms/jobs/scheduled-publish'
import { ensureSystemPages } from './cms/pages/system-pages'
import { EmailLog } from './cms/mail/log'
import { EmailSettings } from './cms/mail/settings'
import { opsCollectTask } from './cms/operations/collect'
import { operationsEndpoints } from './cms/operations/endpoints'
import { opsRetentionTask } from './cms/operations/retention'
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

/**
 * The page globals before the page builder (CC-2): kept unchanged as the record of the former
 * texts, no longer shown or edited; the website reads the pages collection instead.
 */
function legacyPage(global: GlobalConfig): GlobalConfig {
  return {
    ...global,
    admin: { ...global.admin, hidden: true },
    access: { ...global.access, update: () => false },
  }
}

const config = buildConfig({
  serverURL,
  secret: process.env.PAYLOAD_SECRET ?? '',
  telemetry: false,
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' – Youth of Peace Control Center' },
    // Day.month.year and 24-hour time in every admin language (Latin digits in Arabic too).
    dateFormat: 'dd.MM.yyyy, HH:mm',
    // Scheduled publication starts in the association's time zone (no time zones on fields).
    timezones: { defaultTimezone: 'Europe/Berlin' },
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
        // Operations (CC-3): status, backups, logs, domains; e-mail (CC-4).
        operations: {
          Component: '/cms/admin/operations/StatusView#StatusView',
          path: '/operations',
          exact: true,
        },
        operationsBackups: {
          Component: '/cms/admin/operations/BackupsView#BackupsView',
          path: '/operations/backups',
          exact: true,
        },
        operationsLogs: {
          Component: '/cms/admin/operations/LogsView#LogsView',
          path: '/operations/logs',
          exact: true,
        },
        operationsDomains: {
          Component: '/cms/admin/operations/DomainsView#DomainsView',
          path: '/operations/domains',
          exact: true,
        },
      },
      // The interface language (separate from Payload's content language menu) and the bell.
      actions: [
        '/cms/admin/language/LanguageMenu#LanguageMenu',
        '/cms/admin/notifications/Bell#Bell',
      ],
    },
  },
  collections: [
    audited(Pages, 'content'),
    audited(Projects, 'content'),
    audited(News, 'content'),
    audited(Events, 'content'),
    audited(Redirects, 'content'),
    audited(FocusAreas, 'content'),
    audited(TeamMembers, 'content'),
    audited(Statistics, 'content'),
    audited(Partners, 'content'),
    audited(Media, 'content'),
    audited(MembershipApplications, 'association', true),
    audited(ContactMessages, 'association', true),
    audited(Members, 'association', true),
    audited(ProcessingPurposes, 'association'),
    audited(LegalBases, 'association'),
    CaseEvents,
    Exports,
    Notifications,
    Users,
    AuditLog,
    AuthSessions,
    AuthCredentials,
    TrustedDevices,
    RateLimitBuckets,
    OpsSamples,
    OpsEvents,
    EmailLog,
  ],
  globals: [
    ...[
      ...[HomePage, AboutPage, MembershipPage, SupportPage, ContactPage].map(legacyPage),
      Navigation,
      FormTexts,
      LegalNotice,
      PrivacyPolicy,
      SiteSettings,
      ControlCenterSettings,
      EmailSettings,
    ].map((global): GlobalConfig => ({
      ...global,
      hooks: {
        ...global.hooks,
        afterChange: [...(global.hooks?.afterChange ?? []), auditGlobal],
      },
    })),
    // Rewritten every five minutes by the collection job: not an audited change.
    OperationsState,
  ],
  // The operations actions (src/cms/operations/endpoints.ts), under /api/operations.
  endpoints: operationsEndpoints,
  // The fixed pages and the form texts moved out of the old page globals (CC-2): built once from
  // them on the first start of the new version, never overwritten afterwards.
  onInit: async (payload) => {
    try {
      await ensureFormTexts(payload)
      await ensureNavigation(payload)
      await ensureSystemPages(payload, { log: (message) => payload.logger.info(message) })
    } catch (error) {
      // E.g. a database that is not migrated yet (tests, scripts): the website then shows the
      // pages from the old texts directly (src/lib/cms/pages.ts), and the next start tries again.
      payload.logger.warn({ err: error }, 'Could not build the pages from their former texts')
    }
  },
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
    tasks: [
      retentionTask,
      authCleanupTask,
      auditRetentionTask,
      membershipRemindersTask,
      notificationsRetentionTask,
      opsCollectTask,
      opsRetentionTask,
    ],
    // Checks the maintenance queue every 10 minutes (the tasks' own schedules decide when they
    // are due), the operations queue every 5 minutes and the default queue, where scheduled
    // publications wait, every minute.
    autoRun: [
      { cron: '*/10 * * * *', queue: 'maintenance' },
      { cron: '*/5 * * * *', queue: 'operations' },
      { cron: '* * * * *', queue: 'default' },
    ],
    // Finished jobs stay 30 days (ops-retention), so the operations screen can show when each
    // task last ran and with what result.
    deleteJobOnComplete: false,
    access: {
      run: ({ req }) => allowed(req, 'jobs.run'),
      queue: ({ req }) => allowed(req, 'jobs.run'),
      cancel: ({ req }) => allowed(req, 'jobs.run'),
    },
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
    // Payload's menu in the header switches the language of the content being edited; the
    // interface language has its own menu (src/cms/admin/language). Named so they differ.
    translations: {
      de: { general: { locale: 'Inhaltssprache' } },
      en: { general: { locale: 'Content language' } },
      ar: { general: { locale: 'لغة المحتوى' } },
    },
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

// Scheduled publications check that the person who scheduled them may still publish.
export default config.then(withCheckedSchedule)
