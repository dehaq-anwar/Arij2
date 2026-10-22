'use client'

import { useId, useMemo, useState } from 'react'

import { apiJson, fill, Notice } from '../client'
import { Icon } from '../icons'
import { useOpsText } from './actions'
import { parseLine, type Line } from './log-line'

const clock = (iso: string) =>
  iso
    ? new Intl.DateTimeFormat('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Europe/Berlin',
      }).format(new Date(iso))
    : ''

export function LogsClient({ services }: { services: { value: string; label: string }[] }) {
  const { o } = useOpsText()
  // The website's own log first: where most questions start.
  const [service, setService] = useState(
    services.find((s) => s.value === 'app')?.value ?? services[0]?.value ?? 'app',
  )
  const [lines, setLines] = useState(200)
  const [filter, setFilter] = useState('')
  const [errorsOnly, setErrorsOnly] = useState(false)
  const [loaded, setLoaded] = useState<Line[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ids = { service: useId(), lines: useId(), filter: useId(), errors: useId() }

  async function load() {
    setBusy(true)
    setError(null)
    const result = await apiJson<{ lines: string[] }>(
      `/operations/logs?service=${encodeURIComponent(service)}&lines=${lines}`,
    ).catch(() => null)
    setBusy(false)
    if (!result || result.status !== 200) {
      setError(result?.data.error === 'unreachable' ? o.unreachable : o.failed)
      return
    }
    setLoaded(result.data.lines.map(parseLine))
  }

  const shown = useMemo(() => {
    if (!loaded) return []
    const needle = filter.trim().toLowerCase()
    return loaded.filter(
      (line) =>
        (!errorsOnly || line.level !== 'info') &&
        (!needle || line.text.toLowerCase().includes(needle)),
    )
  }, [loaded, filter, errorsOnly])

  return (
    <section className="yop-card" aria-labelledby={`${ids.service}-title`}>
      <h2 id={`${ids.service}-title`} className="yop-visually-hidden">
        {o.logsTitle}
      </h2>
      <div className="yop-ops-log-controls">
        <div>
          <label className="yop-label yop-label--small" htmlFor={ids.service}>
            {o.logService}
          </label>
          <select
            id={ids.service}
            className="yop-input yop-select"
            value={service}
            onChange={(event) => setService(event.target.value)}
          >
            {services.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="yop-label yop-label--small" htmlFor={ids.lines}>
            {o.logLines}
          </label>
          <select
            id={ids.lines}
            className="yop-input yop-select"
            value={lines}
            onChange={(event) => setLines(Number(event.target.value))}
          >
            {[100, 200, 500].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="yop-button yop-button--primary"
          disabled={busy}
          onClick={() => void load()}
        >
          <Icon name="logs" />
          {busy ? o.logLoading : o.logLoad}
        </button>
      </div>
      {loaded ? (
        <div className="yop-ops-log-controls">
          <div className="yop-ops-log-search">
            <label className="yop-label yop-label--small" htmlFor={ids.filter}>
              {o.logFilter}
            </label>
            <input
              id={ids.filter}
              className="yop-input"
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </div>
          <label className="yop-check" htmlFor={ids.errors}>
            <input
              id={ids.errors}
              type="checkbox"
              checked={errorsOnly}
              onChange={(event) => setErrorsOnly(event.target.checked)}
            />
            {o.logErrorsOnly}
          </label>
          <span className="yop-muted" aria-live="polite">
            {fill(o.logCount, { shown: shown.length, total: loaded.length })}
          </span>
        </div>
      ) : null}
      {error ? (
        <Notice tone="error" live>
          {error}
        </Notice>
      ) : null}
      {loaded ? (
        shown.length ? (
          <ol className="yop-log" dir="ltr">
            {shown.map((line, index) => (
              <li key={index} className={`yop-log__line yop-log__line--${line.level}`}>
                <time className="yop-log__time">{clock(line.time)}</time>
                <span className="yop-log__level">{line.level.toUpperCase()}</span>
                <span className="yop-log__text">{line.text}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="yop-empty yop-empty--padded">{o.logEmpty}</p>
        )
      ) : null}
    </section>
  )
}
