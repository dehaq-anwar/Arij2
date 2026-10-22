'use client'

import { useId, useState } from 'react'

import type { AdminLanguage } from '../i18n'
import { formatBytes, formatPercent } from './format'

export type ChartPoint = { t: string; v: number | null }

const W = 600
const H = 120
const TOP = 8
const BOTTOM = 8

const timeLabel = (iso: string, language: AdminLanguage) =>
  new Intl.DateTimeFormat(
    language === 'ar' ? 'ar-u-nu-latn' : language === 'en' ? 'en-GB' : 'de-DE',
    {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Berlin',
    },
  ).format(new Date(iso))

/**
 * One measure over time (plain SVG, no chart library; docs/CONTROL-CENTER.md §9): a 2 px teal
 * line with a light area, a recessive grid, a crosshair with the value under the pointer and,
 * for screen readers and exact values, the same data as a table (hourly). Time runs left to
 * right in every language, like the clock it shows.
 */
export function MetricChart({
  title,
  points,
  kind,
  max,
  language,
  texts,
}: {
  title: string
  points: ChartPoint[]
  kind: 'percent' | 'bytes'
  /** Top of the scale (100 for percentages, the total for bytes). */
  max: number
  language: AdminLanguage
  texts: {
    showTable: string
    colTime: string
    colValue: string
    noData: string
    start: string
    end: string
  }
}) {
  const [active, setActive] = useState<number | null>(null)
  const id = useId()
  const format = (v: number | null) =>
    v == null ? '—' : kind === 'percent' ? formatPercent(v, language) : formatBytes(v, language)
  const valid = points.filter((p) => p.v != null)
  if (!valid.length || max <= 0) return <p className="yop-empty">{texts.noData}</p>

  const n = points.length
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W)
  const y = (v: number) => TOP + (1 - Math.min(1, Math.max(0, v / max))) * (H - TOP - BOTTOM)
  // Gaps (no sample) break the line instead of drawing across them.
  const segments: string[] = []
  let current = ''
  points.forEach((p, i) => {
    if (p.v == null) {
      if (current) segments.push(current)
      current = ''
      return
    }
    current += `${current ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`
  })
  if (current) segments.push(current)
  const line = segments.join('')
  const area = segments
    .map((d) => {
      const coords = d.slice(1).split(/[ML]/)
      const first = coords[0]?.split(',')[0]
      const last = coords.at(-1)?.split(',')[0]
      return `${d}L${last},${H - BOTTOM}L${first},${H - BOTTOM}Z`
    })
    .join('')

  // The table: one row per hour (the average of its points).
  const hours = new Map<string, number[]>()
  for (const p of valid) {
    const key = p.t.slice(0, 13)
    hours.set(key, [...(hours.get(key) ?? []), p.v as number])
  }
  const rows = [...hours.entries()].map(([hour, values]) => ({
    t: `${hour}:00:00.000Z`,
    v: values.reduce((sum, v) => sum + v, 0) / values.length,
  }))

  const point = active != null ? points[active] : null
  const latest = valid.at(-1)!

  return (
    <figure className="yop-chart" aria-labelledby={`${id}-title`}>
      <figcaption className="yop-chart__head">
        <span id={`${id}-title`} className="yop-chart__title">
          {title}
        </span>
        <span className="yop-chart__value">{format(latest.v)}</span>
      </figcaption>
      <div className="yop-chart__plot" dir="ltr">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="yop-chart__svg"
          role="img"
          aria-label={`${title}: ${format(latest.v)}`}
          onPointerMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect()
            const ratio = (event.clientX - box.left) / box.width // logical-css-ok: pointer maths in a left-to-right plot
            setActive(Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1)))))
          }}
          onPointerLeave={() => setActive(null)}
        >
          {[0.5, 1].map((share) => (
            <line
              key={share}
              x1="0"
              x2={W}
              y1={y(max * share)}
              y2={y(max * share)}
              className="yop-chart__grid"
            />
          ))}
          <line x1="0" x2={W} y1={H - BOTTOM} y2={H - BOTTOM} className="yop-chart__base" />
          <path d={area} className="yop-chart__area" />
          <path d={line} className="yop-chart__line" vectorEffect="non-scaling-stroke" />
          {point && point.v != null && active != null ? (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={TOP}
              y2={H - BOTTOM}
              className="yop-chart__cross"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>
        {point && point.v != null && active != null ? (
          <>
            <span
              className="yop-chart__dot"
              style={{
                insetInlineStart: `${(x(active) / W) * 100}%`,
                insetBlockStart: `${(y(point.v) / H) * 100}%`,
              }}
            />
            <span
              className="yop-chart__tooltip"
              style={{
                insetInlineStart: `${Math.min(80, Math.max(0, (x(active) / W) * 100 - 10))}%`,
              }}
            >
              <bdi>{timeLabel(point.t, language)}</bdi> · <strong>{format(point.v)}</strong>
            </span>
          </>
        ) : null}
        <span className="yop-chart__axis" aria-hidden="true">
          <span>{texts.start}</span>
          <span>{texts.end}</span>
        </span>
      </div>
      <details className="yop-chart__table">
        <summary>{texts.showTable}</summary>
        <div className="yop-table-wrap">
          <table className="yop-table">
            <thead>
              <tr>
                <th scope="col">{texts.colTime}</th>
                <th scope="col">{texts.colValue}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.t}>
                  <td>
                    <bdi>{timeLabel(row.t, language)}</bdi>
                  </td>
                  <td>{format(row.v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
