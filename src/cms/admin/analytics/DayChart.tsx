'use client'

import { useId, useState } from 'react'

import type { AdminLanguage } from '../i18n'

const locale = (language: AdminLanguage) =>
  language === 'ar' ? 'ar-u-nu-latn' : language === 'en' ? 'en-GB' : 'de-DE'

const dayLabel = (day: string, language: AdminLanguage) =>
  new Intl.DateTimeFormat(locale(language), {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00Z`))

/**
 * Counts per day as bars (docs/CONTROL-CENTER.md §9): one teal series, thin bars with rounded
 * tops on the baseline (at most 28 px wide, also for seven days), the value of the day under
 * the pointer, and the same numbers as a table. Days run left to right in every language, like
 * a calendar row.
 */
export function DayChart({
  title,
  days,
  language,
  texts,
}: {
  title: string
  days: { day: string; value: number }[]
  language: AdminLanguage
  texts: { showTable: string; colDay: string; colValue: string }
}) {
  const [active, setActive] = useState<number | null>(null)
  const id = useId()
  const max = Math.max(1, ...days.map((d) => d.value))
  const number = (n: number) => new Intl.NumberFormat(locale(language)).format(n)
  const total = days.reduce((sum, d) => sum + d.value, 0)
  const current = active != null ? days[active] : null

  return (
    <figure className="yop-chart" aria-labelledby={`${id}-title`}>
      <figcaption className="yop-chart__head">
        <span id={`${id}-title`} className="yop-chart__title">
          {title}
        </span>
        <span className="yop-chart__value">{number(total)}</span>
      </figcaption>
      <div className="yop-chart__plot" dir="ltr">
        <div
          className="yop-daybars"
          role="img"
          aria-label={`${title}: ${number(total)}`}
          onPointerLeave={() => setActive(null)}
        >
          {days.map((d, i) => (
            <span key={d.day} className="yop-daybars__day" onPointerEnter={() => setActive(i)}>
              <span
                className={`yop-daybars__bar${active === i ? ' yop-daybars__bar--active' : ''}`}
                style={{ blockSize: `${(d.value / max) * 100}%` }}
              />
            </span>
          ))}
        </div>
        {current && active != null ? (
          <span
            className="yop-chart__tooltip"
            style={{
              insetInlineStart: `${Math.min(80, Math.max(0, ((active + 0.5) / days.length) * 100 - 10))}%`,
            }}
          >
            <bdi>{dayLabel(current.day, language)}</bdi> · <strong>{number(current.value)}</strong>
          </span>
        ) : null}
        <span className="yop-chart__axis" aria-hidden="true">
          <bdi>{days[0] ? dayLabel(days[0].day, language) : ''}</bdi>
          <bdi>{days.at(-1) ? dayLabel(days.at(-1)!.day, language) : ''}</bdi>
        </span>
      </div>
      <details className="yop-chart__table">
        <summary>{texts.showTable}</summary>
        <div className="yop-table-wrap">
          <table className="yop-table">
            <thead>
              <tr>
                <th scope="col">{texts.colDay}</th>
                <th scope="col">{texts.colValue}</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.day}>
                  <td>
                    <bdi>{dayLabel(d.day, language)}</bdi>
                  </td>
                  <td>{number(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
