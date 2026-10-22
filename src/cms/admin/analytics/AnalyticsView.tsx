import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'

import sitemap from '@/app/sitemap'
import { indexingAllowed } from '@/lib/site'

import { analyticsSummary, isRange, RANGES, type Range } from '../../analytics/read'
import { agentSetup } from '../../operations/agent'
import { fill } from '../i18n'
import { Icon } from '../icons'
import {
  allowedTo,
  NotAllowed,
  opsContext,
  OpsTemplate,
  PageHead,
  StatePill,
} from '../operations/shared'
import { DayChart } from './DayChart'
import { analyticsTexts } from './texts'

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

async function sitemapSize() {
  try {
    return (await sitemap()).length
  } catch {
    return null
  }
}

/**
 * Statistics without cookies (docs/CONTROL-CENTER.md §7), for `analytics.read`: page views and
 * visits per day, the most visited pages, languages, sources (domain only), addresses not found
 * (with "create redirect") and server errors (with a link to the logs), the sitemap and the
 * indexing switch. Counted hourly by the operations agent from the web server's log.
 */
export async function AnalyticsView(props: AdminViewServerProps) {
  const ctx = await opsContext(props, '/admin/analytics')
  const { req, language, o } = ctx
  const a = analyticsTexts[language]
  if (!allowedTo(ctx, 'analytics.read')) {
    return (
      <OpsTemplate props={props}>
        <NotAllowed o={o} />
      </OpsTemplate>
    )
  }
  const requested = one((props.searchParams ?? {}).range as string | string[] | undefined)
  const range: Range = isRange(requested) ? (Number(requested) as Range) : 30
  const [summary, urls] = await Promise.all([
    analyticsSummary(req.payload, range, new Date(), req),
    sitemapSize(),
  ])
  const number = (n: number) =>
    new Intl.NumberFormat(language === 'ar' ? 'ar-u-nu-latn' : language).format(n)
  const percent = (part: number, whole: number) =>
    whole ? `${Math.round((part / whole) * 100)} %` : '—'
  const localeViews = summary.locales.reduce((sum, l) => sum + l.views, 0)
  const canCreateRedirect = allowedTo(ctx, 'content.write')
  const canReadLogs = allowedTo(ctx, 'operations.read')

  return (
    <OpsTemplate props={props}>
      <div className="yop-page yop-ops">
        <PageHead
          eyebrow={a.navInsights}
          title={a.title}
          lead={a.lead}
          icon="chart"
          actions={
            <nav className="yop-segmented" aria-label={a.range}>
              {RANGES.map((value) => (
                <Link
                  key={value}
                  href={`/admin/analytics?range=${value}`}
                  prefetch={false}
                  className="yop-segmented__item"
                  aria-current={value === range ? 'page' : undefined}
                >
                  {fill(a.rangeDays, { n: value })}
                </Link>
              ))}
            </nav>
          }
        />
        {!summary.hours ? (
          <div className="yop-notice yop-notice--info yop-ops-notice" role="status">
            <Icon name="info" />
            <div>
              <strong>{a.notSetUpTitle}</strong>
              <p>{agentSetup() ? a.noData : a.notSetUpBody}</p>
            </div>
          </div>
        ) : null}

        <section className="yop-grid yop-grid--stats" aria-label={a.title}>
          <div className="yop-card yop-stat">
            <span className="yop-stat__top">
              <span className="yop-stat__label">{a.views}</span>
              <span className="yop-stat__icon">
                <Icon name="pages" />
              </span>
            </span>
            <span className="yop-stat__value">{number(summary.totals.views)}</span>
            {summary.totals.bots ? (
              <span className="yop-stat__hint">
                {fill(a.botsHint, { n: number(summary.totals.bots) })}
              </span>
            ) : null}
          </div>
          <div className="yop-card yop-stat">
            <span className="yop-stat__top">
              <span className="yop-stat__label">{a.visits}</span>
              <span className="yop-stat__icon">
                <Icon name="team" />
              </span>
            </span>
            <span className="yop-stat__value">{number(summary.totals.entrances)}</span>
            <span className="yop-stat__hint">{a.visitsHint}</span>
          </div>
          <div className="yop-card yop-stat">
            <span className="yop-stat__top">
              <span className="yop-stat__label">{a.notFound}</span>
              <span className="yop-stat__icon">
                <Icon name="search" />
              </span>
            </span>
            <span className="yop-stat__value">{number(summary.totals.notFound)}</span>
          </div>
          <div className="yop-card yop-stat">
            <span className="yop-stat__top">
              <span className="yop-stat__label">{a.serverErrors}</span>
              <span
                className={`yop-stat__icon${summary.totals.serverErrors ? ' yop-stat__icon--warning' : ''}`}
              >
                <Icon name="alert" />
              </span>
            </span>
            <span className="yop-stat__value">{number(summary.totals.serverErrors)}</span>
          </div>
        </section>

        <section className="yop-card" aria-labelledby="yop-perday-title">
          <h2 id="yop-perday-title" className="yop-visually-hidden">
            {a.perDay}
          </h2>
          <DayChart
            title={a.perDay}
            days={summary.days.map((d) => ({ day: d.day, value: d.views }))}
            language={language}
            texts={{ showTable: o.showTable, colDay: o.colTime, colValue: a.colViews }}
          />
        </section>

        <div className="yop-grid yop-grid--main">
          <section className="yop-card" aria-labelledby="yop-toppages-title">
            <div className="yop-card__head">
              <h2 id="yop-toppages-title">{a.topPages}</h2>
            </div>
            {summary.pages.length ? (
              <div className="yop-table-wrap">
                <table className="yop-table">
                  <thead>
                    <tr>
                      <th scope="col">{a.colPage}</th>
                      <th scope="col">{a.colLanguage}</th>
                      <th scope="col">{a.colViews}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.pages.map((page) => (
                      <tr key={`${page.locale}${page.path}`}>
                        <th scope="row">
                          <code dir="ltr">{page.path}</code>
                        </th>
                        <td>{page.locale.toUpperCase()}</td>
                        <td>{number(page.views)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="yop-empty">{a.none}</p>
            )}
          </section>

          <div className="yop-grid">
            <section className="yop-card" aria-labelledby="yop-languages-title">
              <div className="yop-card__head">
                <h2 id="yop-languages-title">{a.languages}</h2>
              </div>
              <ul className="yop-bars">
                {summary.locales.map((item) => (
                  <li key={item.locale}>
                    <span className="yop-bars__label">
                      <span lang={item.locale}>
                        {(a as Record<string, string>)[`language_${item.locale}`]}
                      </span>
                      <bdi className="yop-bars__value" dir="ltr">
                        {percent(item.views, localeViews)} · {number(item.views)}
                      </bdi>
                    </span>
                    <span className="yop-bars__track" aria-hidden="true">
                      <span
                        className="yop-bars__fill"
                        style={{
                          inlineSize: `${localeViews ? (item.views / localeViews) * 100 : 0}%`,
                        }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
              <p className="yop-hint">{a.languagesHint}</p>
            </section>

            <section className="yop-card" aria-labelledby="yop-sources-title">
              <div className="yop-card__head">
                <h2 id="yop-sources-title">{a.referrers}</h2>
                <span className="yop-card__sub">{a.referrersHint}</span>
              </div>
              <ul className="yop-bars">
                {[
                  { host: a.direct, entrances: summary.direct, own: true },
                  ...summary.referrers.map((r) => ({ ...r, own: false })),
                ].map((item) => (
                  <li key={item.host}>
                    <span className="yop-bars__label">
                      <span dir={item.own ? undefined : 'ltr'}>{item.host}</span>
                      <bdi className="yop-bars__value" dir="ltr">
                        {percent(item.entrances, summary.totals.entrances)} ·{' '}
                        {number(item.entrances)}
                      </bdi>
                    </span>
                    <span className="yop-bars__track" aria-hidden="true">
                      <span
                        className="yop-bars__fill"
                        style={{
                          inlineSize: `${summary.totals.entrances ? (item.entrances / summary.totals.entrances) * 100 : 0}%`,
                        }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <div className="yop-grid yop-grid--main">
          <section className="yop-card" aria-labelledby="yop-missing-title">
            <div className="yop-card__head">
              <h2 id="yop-missing-title">{a.missingTitle}</h2>
              <span className="yop-card__sub">{a.missingHint}</span>
            </div>
            {summary.notFound.length ? (
              <div className="yop-table-wrap">
                <table className="yop-table yop-ops-table">
                  <thead>
                    <tr>
                      <th scope="col">{a.colAddress}</th>
                      <th scope="col">{a.colCount}</th>
                      {canCreateRedirect ? (
                        <th scope="col">
                          <span className="yop-visually-hidden">{a.createRedirect}</span>
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.notFound.map((miss) => (
                      <tr key={miss.path}>
                        <th scope="row">
                          <code dir="ltr">{miss.path}</code>
                        </th>
                        <td>{number(miss.count)}</td>
                        {canCreateRedirect ? (
                          <td className="yop-table__action">
                            <Link
                              className="yop-button yop-button--small"
                              href={`/admin/collections/redirects/create?from=${encodeURIComponent(miss.path)}`}
                              prefetch={false}
                              aria-label={`${a.createRedirect}: ${miss.path}`}
                            >
                              <Icon name="arrow" className="yop-flip" />
                              {a.createRedirect}
                            </Link>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="yop-empty">{a.none}</p>
            )}
          </section>

          <div className="yop-grid">
            <section className="yop-card" aria-labelledby="yop-errors-title">
              <div className="yop-card__head">
                <h2 id="yop-errors-title">{a.errorsTitle}</h2>
                {canReadLogs && summary.errors.length ? (
                  <Link
                    className="yop-link yop-card__more"
                    href="/admin/operations/logs"
                    prefetch={false}
                  >
                    {a.openLogs}
                  </Link>
                ) : null}
              </div>
              {summary.errors.length ? (
                <ul className="yop-list">
                  {summary.errors.map((error) => (
                    <li key={`${error.status}${error.path}`}>
                      <code dir="ltr">{error.path}</code>
                      <bdi className="yop-list__meta" dir="ltr">
                        {error.status} · {number(error.count)}×
                      </bdi>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="yop-empty">{a.none}</p>
              )}
            </section>
            <section className="yop-card" aria-labelledby="yop-sitemap-title">
              <div className="yop-card__head">
                <h2 id="yop-sitemap-title">{a.sitemapTitle}</h2>
                {urls != null ? (
                  <StatePill tone="neutral">{fill(a.sitemapCount, { n: urls })}</StatePill>
                ) : null}
              </div>
              <p className="yop-hint">{indexingAllowed() ? a.indexingOn : a.indexingOff}</p>
            </section>
            <section className="yop-card" aria-labelledby="yop-avail-title">
              <div className="yop-card__head">
                <h2 id="yop-avail-title">{a.uptimeTitle}</h2>
                <StatePill tone="neutral">{o.notSetUp}</StatePill>
              </div>
              <p className="yop-hint">{a.uptimeBody}</p>
              <h3 className="yop-subhead">{a.vitalsTitle}</h3>
              <p className="yop-hint">{a.vitalsBody}</p>
            </section>
          </div>
        </div>
      </div>
    </OpsTemplate>
  )
}
