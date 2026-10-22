'use client'

import { useCallback, useEffect, useState } from 'react'

import type { DnsResult } from '../../mail/dns'
import { apiJson, fill, Notice, useAdminText } from '../client'
import { Icon } from '../icons'
import { mailText, mailTexts } from './texts'

function useMailText() {
  const { lang } = useAdminText()
  return mailTexts[lang]
}

/** A test e-mail to the signed-in person's own address. */
export function TestMailButton({ disabled }: { disabled?: boolean }) {
  const m = useMailText()
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  async function send() {
    setBusy(true)
    setOutcome(null)
    const result = await apiJson<{ to?: string; code?: string }>('/email/test', { method: 'POST' })
    setBusy(false)
    if (result.status === 200) {
      setOutcome({ tone: 'success', text: fill(m.testSent, { to: result.data.to ?? '' }) })
    } else if (result.status === 429) {
      setOutcome({ tone: 'error', text: m.testTooMany })
    } else if (result.data.error === 'not_configured') {
      setOutcome({ tone: 'error', text: m.notConfiguredTitle })
    } else {
      const code = result.data.code ?? '—'
      const refused = mailText(m, `refused_${code}`, '')
      setOutcome({ tone: 'error', text: refused || fill(m.testFailed, { code }) })
    }
  }
  return (
    <div className="yop-ops-action">
      <button
        type="button"
        className="yop-button yop-button--primary"
        disabled={busy || disabled}
        onClick={() => void send()}
      >
        <Icon name="send" />
        {m.sendTest}
      </button>
      <div className="yop-ops-result" aria-live="polite">
        {outcome ? <Notice tone={outcome.tone}>{outcome.text}</Notice> : null}
      </div>
    </div>
  )
}

const TONE = {
  ok: 'good',
  warning: 'warning',
  missing: 'bad',
  unknown: 'neutral',
  error: 'warning',
}
const ICON = {
  ok: 'check',
  warning: 'alert',
  missing: 'alert',
  unknown: 'info',
  error: 'alert',
} as const

/** MX, SPF, DKIM and DMARC, looked up when the screen opens and on request. */
export function DnsChecks({ domain }: { domain: string | null }) {
  const m = useMailText()
  const [results, setResults] = useState<DnsResult[] | null>(null)
  const [busy, setBusy] = useState(Boolean(domain))
  const [failed, setFailed] = useState(false)
  const lookup = useCallback(
    () =>
      apiJson<{ results: DnsResult[] }>('/email/dns')
        .catch(() => null)
        .then((result) => {
          setBusy(false)
          setFailed(result?.status !== 200)
          if (result?.status === 200) setResults(result.data.results)
        }),
    [],
  )
  // Looked up once when the screen opens; the answer arrives asynchronously.
  useEffect(() => {
    if (domain) void lookup()
  }, [domain, lookup])
  const check = () => {
    setBusy(true)
    setFailed(false)
    void lookup()
  }

  return (
    <section className="yop-card" aria-labelledby="yop-dns-title">
      <div className="yop-card__head">
        <h2 id="yop-dns-title">{domain ? fill(m.dnsTitle, { domain }) : m.dnsTitleNone}</h2>
        {domain ? (
          <button
            type="button"
            className="yop-button yop-button--small yop-card__more"
            disabled={busy}
            onClick={check}
          >
            <Icon name="restart" />
            {busy ? m.dnsChecking : m.dnsCheck}
          </button>
        ) : null}
      </div>
      {!domain ? <p className="yop-empty">{m.dnsNoDomain}</p> : null}
      {failed ? <Notice tone="error">{m.dnsFailed}</Notice> : null}
      {domain && !results && !failed ? (
        <p className="yop-empty" aria-live="polite">
          {m.dnsChecking}
        </p>
      ) : null}
      {results ? (
        <div className="yop-table-wrap">
          <table className="yop-table yop-ops-table">
            <thead>
              <tr>
                <th scope="col">{m.colRecord}</th>
                <th scope="col">{m.colStatus}</th>
                <th scope="col">{m.colAdvice}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.key}>
                  <th scope="row">
                    <strong dir="ltr">{result.key.toUpperCase()}</strong>
                  </th>
                  <td>
                    <span className={`yop-pill yop-pill--${TONE[result.status]}`}>
                      <Icon name={ICON[result.status]} />
                      {mailText(m, `status_${result.status}`, result.status)}
                    </span>
                  </td>
                  <td className="yop-ops-detail">
                    {mailText(
                      m,
                      result.reason === 'lookupFailed'
                        ? 'reason_lookupFailed'
                        : `reason_${result.key}_${result.reason}`,
                      '',
                    )}
                    {result.value ? (
                      <code className="yop-mail-record" dir="ltr">
                        {result.value}
                      </code>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
