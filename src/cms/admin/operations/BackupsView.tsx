import type { AdminViewServerProps } from 'payload'

import { agentRead, agentSetup, type AgentReads, type AgentStatus } from '../../operations/agent'
import { readOperationsState } from '../../operations/collect'
import { fill, formatDateTime, type AdminLanguage } from '../i18n'
import { Icon } from '../icons'
import { AgentJobButton } from './actions'
import { formatBytes, formatDuration, formatNumber } from './format'
import {
  AgentNotice,
  allowedTo,
  NotAllowed,
  opsContext,
  OpsTemplate,
  PageHead,
  StatePill,
} from './shared'
import { opsText, type OpsTexts } from './texts'

type EventDoc = {
  id: number
  eventId: string
  kind: 'backup' | 'drill' | 'restart'
  trigger: 'schedule' | 'manual'
  startedAt: string
  finishedAt: string
  ok: boolean
  detail?: Record<string, unknown> | null
}

const num = (value: unknown) => (typeof value === 'number' ? value : null)

/** One line of what a backup or drill did, from the agent's report (counts, sizes, results). */
function describe(event: EventDoc, o: OpsTexts, language: AdminLanguage): string {
  const detail = event.detail ?? {}
  if (!event.ok && typeof detail.error === 'string') return detail.error
  if (event.kind === 'backup') {
    const db = (detail.database ?? {}) as Record<string, unknown>
    const media = (detail.media ?? null) as Record<string, unknown> | null
    return fill(o.backupDetail, {
      db: formatBytes(num(db.bytes), language),
      tables: formatNumber(num(db.tables), language),
      media: media
        ? `${formatNumber(num(media.files), language)} · ${formatBytes(num(media.bytes), language)}`
        : '—',
    })
  }
  if (event.kind === 'drill') {
    return fill(o.drillDetail, {
      tables: formatNumber(num(detail.tablesCompared) ?? num(detail.tables), language),
      rows: formatNumber(num(detail.rowsCompared), language),
      media: formatNumber(num(detail.mediaFiles), language),
      check: typeof detail.repositoryCheck === 'string' ? detail.repositoryCheck : '—',
    })
  }
  return String(detail.service ?? '')
}

const seconds = (event: EventDoc) =>
  (new Date(event.finishedAt).getTime() - new Date(event.startedAt).getTime()) / 1000

function LastResult({
  title,
  event,
  o,
  language,
}: {
  title: string
  event: EventDoc | null
  o: OpsTexts
  language: AdminLanguage
}) {
  return (
    <div className="yop-card yop-stat">
      <span className="yop-stat__top">
        <span className="yop-stat__label">{title}</span>
        {event ? (
          <StatePill tone={event.ok ? 'good' : 'bad'}>
            {event.ok ? o.resultOk : o.resultFailed}
          </StatePill>
        ) : null}
      </span>
      <span className="yop-stat__value yop-stat__value--small">
        <bdi>{event ? formatDateTime(event.finishedAt, language) : o.never}</bdi>
      </span>
      {event ? (
        <span className="yop-stat__hint">
          {opsText(o, `trigger_${event.trigger}`, event.trigger)} ·{' '}
          {formatDuration(seconds(event), language)}
        </span>
      ) : null}
    </div>
  )
}

/**
 * Backups (docs/CONTROL-CENTER.md §8): the last backup and restore drill, schedule, retention,
 * the stored snapshots and the history, with "back up now" and "test a restore" for those who
 * may act. Restoring the live database is deliberately not offered (decision 10).
 */
export async function BackupsView(props: AdminViewServerProps) {
  const ctx = await opsContext(props, '/admin/operations/backups')
  const { req, language, o } = ctx
  if (!allowedTo(ctx, 'operations.read')) {
    return (
      <OpsTemplate props={props}>
        <NotAllowed o={o} />
      </OpsTemplate>
    )
  }
  const setup = agentSetup()
  const lastOf = (kind: 'backup' | 'drill') =>
    req.payload
      .find({
        collection: 'ops-events',
        where: { kind: { equals: kind } },
        sort: '-startedAt',
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req,
      })
      .then((r): EventDoc | null => (r.docs[0] as unknown as EventDoc | undefined) ?? null)
  const [state, history, lastBackup, lastDrill] = await Promise.all([
    readOperationsState(req.payload, req),
    req.payload.find({
      collection: 'ops-events',
      where: { kind: { in: ['backup', 'drill'] } },
      sort: '-startedAt',
      limit: 30,
      depth: 0,
      overrideAccess: true,
      req,
    }),
    lastOf('backup'),
    lastOf('drill'),
  ])
  let live: AgentStatus | null = null
  let backups: AgentReads['/v1/backups'] | null = null
  if (setup) {
    ;[live, backups] = await Promise.all([
      agentRead('/v1/status', {}, { setup, timeoutMs: 5_000 }).catch(() => null),
      agentRead('/v1/backups', {}, { setup, timeoutMs: 20_000 }).catch(() => null),
    ])
  }
  const snapshots = backups?.snapshots ?? null
  const snapshotError = backups?.error ?? null
  const status = live ?? state.status ?? null
  const backup = status?.agent.backup
  const configured = Boolean(backup?.configured)
  const canAct = allowedTo(ctx, 'operations.act') && Boolean(live) && configured
  const events = history.docs as unknown as EventDoc[]

  return (
    <OpsTemplate props={props}>
      <div className="yop-page yop-ops">
        <PageHead
          eyebrow={o.navOperations}
          title={o.backupsTitle}
          lead={o.backupsLead}
          icon="backup"
          actions={
            canAct ? (
              <>
                <AgentJobButton kind="drill" />
                <AgentJobButton kind="backup" primary />
              </>
            ) : null
          }
        />
        <AgentNotice
          configured={Boolean(setup)}
          reachable={Boolean(live)}
          state={state}
          o={o}
          language={language}
        />
        {setup && status && !configured ? (
          <div className="yop-notice yop-notice--warning yop-ops-notice" role="status">
            <Icon name="alert" />
            <div>
              <strong>{o.backupsMissingTitle}</strong>
              <p>{o.backupsMissingBody}</p>
            </div>
          </div>
        ) : null}
        {status?.running ? (
          <div className="yop-notice yop-notice--info yop-ops-notice" role="status">
            <Icon name="clock" />
            <div>
              {fill(o.running, {
                kind: opsText(o, `kind_${status.running.kind}`, status.running.kind),
                time: formatDateTime(status.running.startedAt, language),
              })}
            </div>
          </div>
        ) : null}

        <section className="yop-grid yop-grid--stats" aria-label={o.backupsTitle}>
          <LastResult title={o.lastBackup} event={lastBackup} o={o} language={language} />
          <LastResult title={o.lastDrill} event={lastDrill} o={o} language={language} />
          <div className="yop-card yop-stat">
            <span className="yop-stat__top">
              <span className="yop-stat__label">{o.scheduleTitle}</span>
              <span className="yop-stat__icon">
                <Icon name="clock" />
              </span>
            </span>
            {backup ? (
              <>
                <span className="yop-stat__value yop-stat__value--small">
                  {fill(o.scheduleBackup, { time: backup.schedule.backup })}
                </span>
                <span className="yop-stat__hint">
                  {fill(o.scheduleDrill, {
                    day: opsText(
                      o,
                      `weekday_${backup.schedule.drillDay}`,
                      backup.schedule.drillDay,
                    ),
                    time: backup.schedule.drill,
                  })}{' '}
                  ({backup.timeZone})
                </span>
              </>
            ) : (
              <span className="yop-stat__value yop-stat__value--small">{o.notSetUp}</span>
            )}
          </div>
          <div className="yop-card yop-stat">
            <span className="yop-stat__top">
              <span className="yop-stat__label">{o.retentionTitle}</span>
              <span className="yop-stat__icon">
                <Icon name="calendar" />
              </span>
            </span>
            <span className="yop-stat__value yop-stat__value--small">
              {backup ? fill(o.retentionValue, backup.keep) : o.notSetUp}
            </span>
            <span className="yop-stat__hint">{o.retentionNote}</span>
          </div>
        </section>

        <section className="yop-card" aria-labelledby="yop-history-title">
          <div className="yop-card__head">
            <h2 id="yop-history-title">{o.historyTitle}</h2>
          </div>
          {events.length ? (
            <div className="yop-table-wrap">
              <table className="yop-table yop-ops-table">
                <thead>
                  <tr>
                    <th scope="col">{o.colStarted}</th>
                    <th scope="col">{o.colKind}</th>
                    <th scope="col">{o.colResult}</th>
                    <th scope="col">{o.colDuration}</th>
                    <th scope="col">{o.colDetails}</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const problems = Array.isArray(event.detail?.problems)
                      ? (event.detail.problems as string[])
                      : []
                    return (
                      <tr key={event.id}>
                        <td>
                          <bdi>{formatDateTime(event.startedAt, language)}</bdi>
                        </td>
                        <td>
                          {opsText(o, `kind_${event.kind}`, event.kind)}
                          <span className="yop-list__meta">
                            {opsText(o, `trigger_${event.trigger}`, event.trigger)}
                          </span>
                        </td>
                        <td>
                          <StatePill tone={event.ok ? 'good' : 'bad'}>
                            {event.ok ? o.resultOk : o.resultFailed}
                          </StatePill>
                        </td>
                        <td>{formatDuration(seconds(event), language)}</td>
                        <td className="yop-ops-detail">
                          <span dir="auto">{describe(event, o, language)}</span>
                          {problems.length ? (
                            <details>
                              <summary>
                                {o.problems} ({problems.length})
                              </summary>
                              <ul className="yop-plain-list" dir="ltr">
                                {problems.map((problem) => (
                                  <li key={problem}>
                                    <code>{problem}</code>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="yop-empty yop-empty--padded">{o.noHistory}</p>
          )}
        </section>

        <section className="yop-card" aria-labelledby="yop-snapshots-title">
          <div className="yop-card__head">
            <h2 id="yop-snapshots-title">{o.snapshotsTitle}</h2>
          </div>
          {snapshotError ? (
            <div className="yop-notice yop-notice--error" role="status">
              <Icon name="alert" />
              <div>
                <code dir="ltr">{snapshotError}</code>
              </div>
            </div>
          ) : null}
          {snapshots?.length ? (
            <div className="yop-table-wrap">
              <table className="yop-table yop-ops-table">
                <thead>
                  <tr>
                    <th scope="col">{o.colTime}</th>
                    <th scope="col">{o.colType}</th>
                    <th scope="col">{o.colSize}</th>
                    <th scope="col">{o.colId}</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.slice(0, 40).map((snapshot) => (
                    <tr key={snapshot.id}>
                      <td>
                        <bdi>{formatDateTime(snapshot.time, language)}</bdi>
                      </td>
                      <td>{opsText(o, `type_${snapshot.kind}`, snapshot.kind)}</td>
                      <td>{formatBytes(snapshot.bytes, language)}</td>
                      <td>
                        <code dir="ltr">{snapshot.shortId}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="yop-empty yop-empty--padded">
              {configured || !setup ? o.noSnapshots : o.notSetUp}
            </p>
          )}
          <p className="yop-hint yop-ops-footnote">
            <Icon name="info" />
            {o.restoreNote}
          </p>
        </section>
      </div>
    </OpsTemplate>
  )
}
