import { MIN_SECRET_LENGTH } from './protocol.ts'

/** Services the Control Center may restart. Fixed here; the environment can only narrow it. */
export const RESTARTABLE = ['app', 'caddy'] as const
export type Restartable = (typeof RESTARTABLE)[number]

export type MediaSource = 'none' | 'path' | 's3'

export type AgentConfig = {
  secret: string
  host: string
  port: number
  version: string
  /** Docker Engine API, only through docker-socket-proxy. */
  dockerUrl: string
  composeProject: string
  /** Compose services shown in the status list (others in the project are ignored). */
  services: string[]
  restartable: Restartable[]
  stateDir: string
  timeZone: string
  backup: {
    databaseUrl: string
    /** Connection to the maintenance database, for creating and dropping the drill database. */
    drillAdminUrl: string
    drillDatabase: string
    repositoryConfigured: boolean
    media: MediaSource
    mediaPath: string
    mediaMirror: string
    time: string
    drillDay: number
    drillTime: string
    keep: { daily: number; weekly: number; monthly: number }
    prune: boolean
  }
  accessLogDir: string
  accessLogPrefix: string
  siteHost: string
  certificates: { hosts: string[]; connect: string }
  bin: { restic: string; pgDump: string; pgRestore: string; psql: string; rclone: string }
}

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

const time = (value: string | undefined, fallback: string) =>
  value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback

const count = (value: string | undefined, fallback: number) => {
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 && n <= 1000 ? n : fallback
}

const list = (value: string | undefined, fallback: string[]) =>
  value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : fallback

/** With the drill's admin connection unset, the backup connection's server and `postgres`. */
function maintenanceUrl(databaseUrl: string): string {
  if (!databaseUrl) return ''
  try {
    const url = new URL(databaseUrl)
    url.pathname = '/postgres'
    return url.toString()
  } catch {
    return ''
  }
}

export function loadConfig(env: Record<string, string | undefined> = process.env): AgentConfig {
  const secret = env.OPS_AGENT_SECRET ?? ''
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`OPS_AGENT_SECRET must be at least ${MIN_SECRET_LENGTH} characters`)
  }
  const databaseUrl = env.BACKUP_DATABASE_URL ?? ''
  const media = (['none', 'path', 's3'] as const).find((m) => m === env.BACKUP_MEDIA) ?? 'none'
  const restartable = RESTARTABLE.filter((s) =>
    list(env.RESTARTABLE_SERVICES, [...RESTARTABLE]).includes(s),
  )
  const drillDay = DAYS.indexOf((env.DRILL_DAY ?? 'sun').toLowerCase())
  return {
    secret,
    host: env.HOST || '0.0.0.0',
    port: count(env.PORT, 4100) || 4100,
    version: env.AGENT_VERSION || 'dev',
    dockerUrl: env.DOCKER_URL || 'http://socket-proxy:2375',
    composeProject: env.COMPOSE_PROJECT || 'yop',
    services: list(env.SERVICES, ['caddy', 'app', 'postgres', 'ops-agent', 'socket-proxy']),
    restartable,
    stateDir: env.STATE_DIR || '/var/lib/agent',
    timeZone: env.TIME_ZONE || 'Europe/Berlin',
    backup: {
      databaseUrl,
      drillAdminUrl: env.DRILL_ADMIN_URL || maintenanceUrl(databaseUrl),
      drillDatabase: /^[a-z_][a-z0-9_]{0,62}$/.test(env.DRILL_DATABASE ?? '')
        ? (env.DRILL_DATABASE as string)
        : 'restore_drill',
      repositoryConfigured: Boolean(
        env.RESTIC_REPOSITORY && (env.RESTIC_PASSWORD || env.RESTIC_PASSWORD_FILE),
      ),
      media,
      mediaPath: env.BACKUP_MEDIA_PATH || '',
      mediaMirror: env.BACKUP_MEDIA_MIRROR || `${env.STATE_DIR || '/var/lib/agent'}/media-mirror`,
      time: time(env.BACKUP_TIME, '02:30'),
      drillDay: drillDay >= 0 ? drillDay : 0,
      drillTime: time(env.DRILL_TIME, '04:00'),
      keep: {
        daily: count(env.BACKUP_KEEP_DAILY, 7),
        weekly: count(env.BACKUP_KEEP_WEEKLY, 4),
        monthly: count(env.BACKUP_KEEP_MONTHLY, 6),
      },
      prune: env.BACKUP_PRUNE !== 'false',
    },
    accessLogDir: env.ACCESS_LOG_DIR || '/var/log/caddy',
    accessLogPrefix: env.ACCESS_LOG_PREFIX || 'access',
    siteHost: env.SITE_HOST || '',
    certificates: {
      hosts: list(env.CERT_HOSTS, []),
      connect: env.CERT_CONNECT || 'caddy:443',
    },
    bin: {
      restic: env.RESTIC_BIN || 'restic',
      pgDump: env.PG_DUMP_BIN || 'pg_dump',
      pgRestore: env.PG_RESTORE_BIN || 'pg_restore',
      psql: env.PSQL_BIN || 'psql',
      rclone: env.RCLONE_BIN || 'rclone',
    },
  }
}

export const backupConfigured = (config: AgentConfig) =>
  Boolean(config.backup.databaseUrl && config.backup.repositoryConfigured)
