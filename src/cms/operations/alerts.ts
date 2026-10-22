import type { AgentEvent, AgentStatus, CertificateStatus, Sample } from './agent'

/**
 * When the Control Center warns the people who run the server (operations.act): in the bell,
 * and by e-mail to the technical address if one is set (src/cms/email). Each warning names what
 * it is about (a service, a host, a backup); the same warning is repeated at most once a day
 * while the cause lasts.
 */
export const OPERATIONS_ALERTS = [
  'opsAgentUnreachable',
  'opsServiceDown',
  'opsBackupFailed',
  'opsBackupOverdue',
  'opsDrillFailed',
  'opsRestartFailed',
  'opsCertificate',
  'opsDiskFull',
] as const
export type OperationsAlertKind = (typeof OPERATIONS_ALERTS)[number]

export type OperationsAlert = {
  kind: OperationsAlertKind
  /** What it is about, shown with the notice: a service, a host, a time. */
  subject: string
  href: string
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
/** The agent has not answered for this long. */
export const AGENT_SILENCE_MS = 15 * MINUTE
/** A nightly backup is missing after this long (one night plus slack). */
export const BACKUP_OVERDUE_MS = 26 * HOUR
export const DISK_WARNING = 0.9

const berlinMinute = (iso: string) =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))

export type AlertInput = {
  now: Date
  /** Since when the agent has failed to answer (null while it answers). */
  failingSince: Date | null
  status: AgentStatus | null
  newEvents: AgentEvent[]
  /** Finish time of the newest successful backup known to the Control Center. */
  lastGoodBackupAt: Date | null
  certificates: CertificateStatus[] | null
  latestSample: Pick<Sample, 'diskUsedBytes' | 'diskTotalBytes'> | null
}

export function operationsAlerts(input: AlertInput): OperationsAlert[] {
  const alerts: OperationsAlert[] = []
  const { now, status } = input
  if (input.failingSince && now.getTime() - input.failingSince.getTime() >= AGENT_SILENCE_MS) {
    alerts.push({ kind: 'opsAgentUnreachable', subject: 'ops-agent', href: '/admin/operations' })
  }
  if (status) {
    const seen = new Set(status.containers.map((c) => c.service))
    for (const container of status.containers) {
      if (container.state !== 'running' || container.health === 'unhealthy') {
        alerts.push({
          kind: 'opsServiceDown',
          subject: container.service,
          href: '/admin/operations',
        })
      }
    }
    for (const service of status.agent.services ?? []) {
      if (!seen.has(service) && status.docker.reachable) {
        alerts.push({ kind: 'opsServiceDown', subject: service, href: '/admin/operations' })
      }
    }
    if (status.agent.backup.configured) {
      const since = input.lastGoodBackupAt ?? new Date(status.agent.startedAt)
      if (now.getTime() - since.getTime() >= BACKUP_OVERDUE_MS && !status.running) {
        alerts.push({
          kind: 'opsBackupOverdue',
          subject: 'backup',
          href: '/admin/operations/backups',
        })
      }
    }
  }
  for (const event of input.newEvents) {
    if (event.ok) continue
    const kind =
      event.kind === 'backup'
        ? 'opsBackupFailed'
        : event.kind === 'drill'
          ? 'opsDrillFailed'
          : 'opsRestartFailed'
    alerts.push({
      kind,
      subject:
        event.kind === 'restart'
          ? `${String(event.detail.service ?? '')} · ${berlinMinute(event.startedAt)}`
          : berlinMinute(event.startedAt),
      href: event.kind === 'restart' ? '/admin/operations' : '/admin/operations/backups',
    })
  }
  for (const certificate of input.certificates ?? []) {
    if (!certificate.ok) {
      alerts.push({
        kind: 'opsCertificate',
        subject: certificate.host,
        href: '/admin/operations/domains',
      })
    }
  }
  const sample = input.latestSample
  if (
    sample &&
    sample.diskTotalBytes > 0 &&
    sample.diskUsedBytes / sample.diskTotalBytes >= DISK_WARNING
  ) {
    alerts.push({ kind: 'opsDiskFull', subject: 'disk', href: '/admin/operations' })
  }
  return alerts
}
