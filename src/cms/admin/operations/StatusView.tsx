import type { AdminViewServerProps } from 'payload'

import {
  agentRead,
  agentSetup,
  type AgentStatus,
  type ContainerStatus,
} from '../../operations/agent'
import { readOperationsState } from '../../operations/collect'
import { databaseFigures } from '../../operations/database'
import { MANUAL_JOBS, RESTARTABLE_SERVICES } from '../../operations/endpoints'
import { bucketSamples, lastTaskRuns, recentSamples } from '../../operations/read'
import { fill, formatDateTime } from '../i18n'
import { Icon } from '../icons'
import { JobButton, RefreshButton, RestartButton } from './actions'
import { formatBytes, formatNumber, formatPercent, percentOf } from './format'
import { MetricChart } from './MetricChart'
import {
  AgentNotice,
  allowedTo,
  NotAllowed,
  opsContext,
  OpsTemplate,
  PageHead,
  StatePill,
  type Tone,
} from './shared'
import { opsText } from './texts'

function containerTone(container: ContainerStatus | null): Tone {
  if (!container) return 'bad'
  if (container.health === 'unhealthy') return 'bad'
  if (container.state === 'running') return container.health === 'starting' ? 'warning' : 'good'
  if (container.state === 'restarting' || container.state === 'created') return 'warning'
  return 'bad'
}

/**
 * Services & status (docs/CONTROL-CENTER.md §3.6): the Compose services as the agent sees them,
 * host resources over 24 hours, the release, the database and the scheduled tasks. Live from the
 * agent when it answers, otherwise the last known state with its time.
 */
export async function StatusView(props: AdminViewServerProps) {
  const ctx = await opsContext(props, '/admin/operations')
  const { req, language, o, t } = ctx
  if (!allowedTo(ctx, 'operations.read')) {
    return (
      <OpsTemplate props={props}>
        <NotAllowed o={o} />
      </OpsTemplate>
    )
  }
  const now = new Date()
  const setup = agentSetup()
  const [state, samples, database, runs] = await Promise.all([
    readOperationsState(req.payload, req),
    recentSamples(req.payload, now, req),
    databaseFigures(req.payload, now).catch(() => null),
    lastTaskRuns(req.payload, req),
  ])
  let live: AgentStatus | null = null
  if (setup) live = await agentRead('/v1/status', {}, { setup, timeoutMs: 5_000 }).catch(() => null)
  const status = live ?? state.status ?? null
  const statusTime = live ? now.toISOString() : (state.lastContactAt ?? null)
  const series = bucketSamples(samples, now)
  const latest = samples.at(-1)
  const canAct = allowedTo(ctx, 'operations.act') && Boolean(live)
  const canRun = allowedTo(ctx, 'jobs.run')

  const services = status
    ? [
        ...new Set([
          ...(status.agent.services ?? []),
          ...status.containers.map((container) => container.service),
        ]),
      ].map((service) => ({
        service,
        container: status.containers.find((c) => c.service === service) ?? null,
      }))
    : []

  const memoryShare = percentOf(latest?.memoryUsed, latest?.memoryTotal)
  const diskShare = percentOf(latest?.diskUsed, latest?.diskTotal)
  const chartTexts = {
    showTable: o.showTable,
    colTime: o.colTime,
    colValue: o.colValue,
    noData: o.noSamples,
    start: o.chartStart,
    end: o.chartEnd,
  }

  return (
    <OpsTemplate props={props}>
      <div className="yop-page yop-ops">
        <PageHead
          eyebrow={o.navOperations}
          title={o.statusTitle}
          lead={o.statusLead}
          icon="server"
          actions={setup ? <RefreshButton /> : null}
        />
        <AgentNotice
          configured={Boolean(setup)}
          reachable={Boolean(live)}
          state={state}
          o={o}
          language={language}
        />

        <section className="yop-grid yop-grid--stats" aria-label={o.currentValues}>
          <div className="yop-card yop-stat">
            <span className="yop-stat__top">
              <span className="yop-stat__label">{o.cpu}</span>
              <span className="yop-stat__icon">
                <Icon name="chart" />
              </span>
            </span>
            <span className="yop-stat__value">{formatPercent(latest?.cpuPercent, language)}</span>
          </div>
          <div className="yop-card yop-stat">
            <span className="yop-stat__top">
              <span className="yop-stat__label">{o.memory}</span>
              <span className="yop-stat__icon">
                <Icon name="device" />
              </span>
            </span>
            <span className="yop-stat__value">{formatPercent(memoryShare, language)}</span>
            {latest?.memoryTotal ? (
              <span className="yop-stat__hint">
                {fill(o.ofTotal, {
                  used: formatBytes(latest.memoryUsed, language),
                  total: formatBytes(latest.memoryTotal, language),
                })}
              </span>
            ) : null}
          </div>
          <div className="yop-card yop-stat">
            <span className="yop-stat__top">
              <span className="yop-stat__label">{o.disk}</span>
              <span
                className={`yop-stat__icon${diskShare != null && diskShare >= 90 ? ' yop-stat__icon--warning' : ''}`}
              >
                <Icon name={diskShare != null && diskShare >= 90 ? 'alert' : 'backup'} />
              </span>
            </span>
            <span className="yop-stat__value">{formatPercent(diskShare, language)}</span>
            {latest?.diskTotal ? (
              <span className="yop-stat__hint">
                {fill(o.ofTotal, {
                  used: formatBytes(latest.diskUsed, language),
                  total: formatBytes(latest.diskTotal, language),
                })}
              </span>
            ) : null}
          </div>
          <div className="yop-card yop-stat">
            <span className="yop-stat__top">
              <span className="yop-stat__label">{o.databaseSize}</span>
              <span className="yop-stat__icon">
                <Icon name="backup" />
              </span>
            </span>
            <span className="yop-stat__value">{formatBytes(database?.bytes, language)}</span>
            {database ? (
              <span className="yop-stat__hint">
                {o.dbConnections}: {database.connections} / {database.maxConnections}
              </span>
            ) : null}
          </div>
        </section>

        <section className="yop-card" aria-labelledby="yop-services-title">
          <div className="yop-card__head">
            <h2 id="yop-services-title">{o.servicesTitle}</h2>
            <span className="yop-card__sub">
              {statusTime
                ? fill(o.asOf, { time: formatDateTime(statusTime, language) })
                : o.notSetUp}
            </span>
          </div>
          {services.length ? (
            <div className="yop-table-wrap">
              <table className="yop-table yop-ops-table">
                <thead>
                  <tr>
                    <th scope="col">{o.colService}</th>
                    <th scope="col">{o.colState}</th>
                    <th scope="col">{o.colSince}</th>
                    <th scope="col">{o.colRestarts}</th>
                    <th scope="col">{o.colImage}</th>
                    {canAct ? (
                      <th scope="col">
                        <span className="yop-visually-hidden">{o.restart}</span>
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {services.map(({ service, container }) => {
                    const name = opsText(o, `service_${service}`, service)
                    const stateWord = container
                      ? opsText(o, `state_${container.state}`, container.state)
                      : o.state_missing
                    const health = container?.health
                      ? opsText(o, `health_${container.health}`, container.health)
                      : null
                    return (
                      <tr key={service}>
                        <th scope="row">
                          <span className="yop-ops-service">
                            <strong>{name}</strong>
                            <code dir="ltr">{service}</code>
                          </span>
                        </th>
                        <td>
                          <StatePill tone={containerTone(container)}>
                            {stateWord}
                            {health ? ` · ${health}` : ''}
                          </StatePill>
                        </td>
                        <td>
                          <bdi>
                            {container?.startedAt && container.state === 'running'
                              ? formatDateTime(container.startedAt, language)
                              : '—'}
                          </bdi>
                        </td>
                        <td>{formatNumber(container?.restartCount, language)}</td>
                        <td>
                          <code className="yop-ops-image" dir="ltr">
                            {container?.image.split('@')[0] ?? '—'}
                          </code>
                        </td>
                        {canAct ? (
                          <td className="yop-table__action">
                            {RESTARTABLE_SERVICES.includes(
                              service as (typeof RESTARTABLE_SERVICES)[number],
                            ) && status?.agent.restartable.includes(service) ? (
                              <RestartButton service={service} name={name} />
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="yop-empty yop-empty--padded">{setup ? o.agentNeverBody : o.notSetUp}</p>
          )}
        </section>

        <section className="yop-card" aria-labelledby="yop-resources-title">
          <div className="yop-card__head">
            <h2 id="yop-resources-title">{o.resourcesTitle}</h2>
            <span className="yop-card__sub">{o.resourcesHint}</span>
          </div>
          <div className="yop-ops-charts">
            <MetricChart
              title={o.cpu}
              points={series.cpu}
              kind="percent"
              max={100}
              language={language}
              texts={chartTexts}
            />
            <MetricChart
              title={o.memory}
              points={series.memory}
              kind="percent"
              max={100}
              language={language}
              texts={chartTexts}
            />
            <MetricChart
              title={o.disk}
              points={series.disk}
              kind="percent"
              max={100}
              language={language}
              texts={chartTexts}
            />
          </div>
        </section>

        <div className="yop-grid yop-grid--main">
          <section className="yop-card" aria-labelledby="yop-jobs-title">
            <div className="yop-card__head">
              <h2 id="yop-jobs-title">{o.jobsTitle}</h2>
              <span className="yop-card__sub">{o.jobsHint}</span>
            </div>
            <div className="yop-table-wrap">
              <table className="yop-table yop-ops-table">
                <thead>
                  <tr>
                    <th scope="col">{o.colTask}</th>
                    <th scope="col">{o.colLastRun}</th>
                    <th scope="col">{o.colResult}</th>
                    {canRun ? (
                      <th scope="col">
                        <span className="yop-visually-hidden">{o.runNow}</span>
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => {
                    const label = opsText(o, `job_${run.task}`, run.task)
                    const manual = MANUAL_JOBS[run.task]
                    return (
                      <tr key={run.task}>
                        <th scope="row">
                          <span className="yop-ops-service">
                            <strong>{label}</strong>
                            <span className="yop-muted">
                              {opsText(o, `schedule_${run.task}`, '')}
                              {manual?.deletes ? (
                                <span className="yop-ops-code">
                                  <Icon name="lock" />
                                  {o.codeNeeded}
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </th>
                        <td>
                          <bdi>
                            {run.completedAt ? formatDateTime(run.completedAt, language) : o.never}
                          </bdi>
                        </td>
                        <td>
                          {run.ok == null ? (
                            '—'
                          ) : (
                            <StatePill tone={run.ok ? 'good' : 'bad'}>
                              {run.ok ? o.jobOk : o.jobFailed}
                            </StatePill>
                          )}
                        </td>
                        {canRun ? (
                          <td className="yop-table__action">
                            {manual ? <JobButton task={run.task} label={label} /> : null}
                          </td>
                        ) : null}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="yop-grid">
            <section className="yop-card" aria-labelledby="yop-release-title">
              <div className="yop-card__head">
                <h2 id="yop-release-title">{o.releaseTitle}</h2>
              </div>
              <dl className="yop-facts">
                <div>
                  <dt>{o.releaseApp}</dt>
                  <dd dir="ltr">{process.env.APP_VERSION || o.releaseUnknown}</dd>
                </div>
                <div>
                  <dt>{o.releaseCommit}</dt>
                  <dd dir="ltr">
                    <code>{(process.env.APP_COMMIT || '—').slice(0, 12)}</code>
                  </dd>
                </div>
                <div>
                  <dt>{o.releaseAgent}</dt>
                  <dd dir="ltr">{status?.agent.version ?? '—'}</dd>
                </div>
                {status?.agent.tools
                  ? Object.entries(status.agent.tools)
                      .filter(([, version]) => version)
                      .map(([tool, version]) => (
                        <div key={tool}>
                          <dt dir="ltr">{tool}</dt>
                          <dd dir="ltr" className="yop-ops-tool" title={version ?? ''}>
                            {/\d+\.\d+(\.\d+)?/.exec(version ?? '')?.[0] ?? version}
                          </dd>
                        </div>
                      ))
                  : null}
              </dl>
            </section>
            <section className="yop-card" aria-labelledby="yop-database-title">
              <div className="yop-card__head">
                <h2 id="yop-database-title">{o.databaseTitle}</h2>
              </div>
              {database ? (
                <>
                  <dl className="yop-facts">
                    <div>
                      <dt>{o.dbSize}</dt>
                      <dd>{formatBytes(database.bytes, language)}</dd>
                    </div>
                    <div>
                      <dt>{o.dbConnections}</dt>
                      <dd>
                        {database.connections} / {database.maxConnections}
                      </dd>
                    </div>
                    <div>
                      <dt>{o.dbVersion}</dt>
                      <dd dir="ltr">{database.version}</dd>
                    </div>
                  </dl>
                  <h3 className="yop-subhead">{o.dbTables}</h3>
                  <ul className="yop-list yop-ops-tables">
                    {database.tables.map((table) => (
                      <li key={table.name}>
                        <code dir="ltr">{table.name}</code>
                        <span className="yop-list__meta">{formatBytes(table.bytes, language)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="yop-empty">{t.genericError}</p>
              )}
            </section>
            <section className="yop-card" aria-labelledby="yop-uptime-title">
              <div className="yop-card__head">
                <h2 id="yop-uptime-title">{o.uptimeTitle}</h2>
                <StatePill tone="neutral">{o.notSetUp}</StatePill>
              </div>
              <p className="yop-hint">{o.uptimeBody}</p>
            </section>
          </div>
        </div>
      </div>
    </OpsTemplate>
  )
}
