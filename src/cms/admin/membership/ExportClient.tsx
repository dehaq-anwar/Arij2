'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'

import type { ExportDataset } from '../../membership/export'
import { fill, Notice, StepUpDialog, useAdminText } from '../client'
import { Icon } from '../icons'

type Column = { key: string; label: string }
type Props = {
  datasets: ExportDataset[]
  initial: { dataset: ExportDataset; stage: string; status: string; type: string; q: string }
  columns: Record<string, Column[]>
  legalBases: { id: string; label: string }[]
  recent: { id: number; when: string; dataset: ExportDataset; rows: number; purpose: string }[]
  notAllowed: string | null
}

const STAGES = ['all', 'open', 'received', 'inReview', 'consentPending', 'accepted', 'rejected']
const MEMBER_STATUSES = ['active', 'ended', 'all']
const DEFAULT_COLUMNS = ['firstName', 'lastName']

export function ExportClient({
  datasets,
  initial,
  columns,
  legalBases,
  recent,
  notAllowed,
}: Props) {
  const { t } = useAdminText()
  const router = useRouter()
  const id = useId()
  const [dataset, setDataset] = useState<ExportDataset>(initial.dataset)
  const [stage, setStage] = useState(initial.stage)
  const [status, setStatus] = useState(initial.status)
  const [type, setType] = useState(initial.type)
  const [q, setQ] = useState(initial.q)
  const [chosen, setChosen] = useState<string[]>(DEFAULT_COLUMNS)
  const [purpose, setPurpose] = useState('')
  const [basis, setBasis] = useState('')
  const [busy, setBusy] = useState(false)
  const [stepUp, setStepUp] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  if (notAllowed) {
    return (
      <div className="yop-page">
        <h1>{t.exportTitle}</h1>
        <Notice tone="warning">{notAllowed}</Notice>
      </div>
    )
  }

  const available = columns[dataset] ?? []
  const purposeLength = purpose.replace(/\s+/g, ' ').trim().length
  const ready = chosen.length > 0 && purposeLength >= 10 && purposeLength <= 300 && basis !== ''

  async function run() {
    setBusy(true)
    setMessage(null)
    const response = await fetch('/api/exports/run', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataset,
        columns: chosen,
        filter: dataset === 'applications' ? { stage, type, q } : { status, type, q },
        purpose,
        legalBasis: basis,
      }),
    })
    if (response.ok) {
      const blob = await response.blob()
      const name =
        /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ??
        'export.csv'
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = name
      document.body.append(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setBusy(false)
      setPurpose('')
      setMessage({
        tone: 'success',
        text: fill(t.exportDone, { rows: response.headers.get('X-Export-Rows') ?? '0' }),
      })
      router.refresh()
      return
    }
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    setBusy(false)
    if (response.status === 403 && data.error === 'step_up_required') {
      setStepUp(true)
      return
    }
    const key = `exportErr_${data.error}` as keyof typeof t
    setMessage({ tone: 'error', text: (t[key] as string | undefined) ?? t.genericError })
  }

  const toggle = (key: string) =>
    setChosen((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    )

  return (
    <div className="yop-page yop-export">
      <div className="yop-page__head">
        <div>
          <h1 className="yop-page__title">
            <span className="yop-page__icon">
              <Icon name="download" />
            </span>
            {t.exportTitle}
          </h1>
          <p className="yop-lead">{t.exportLead}</p>
        </div>
      </div>
      <div className="yop-grid yop-grid--main">
        <section className="yop-card" aria-labelledby={`${id}-form`}>
          <h2 id={`${id}-form`} className="yop-visually-hidden">
            {t.exportTitle}
          </h2>
          {!legalBases.length && <Notice tone="warning">{t.noLegalBases}</Notice>}
          <div className="yop-form">
            {datasets.length > 1 && (
              <fieldset className="yop-fieldset">
                <legend className="yop-label">{t.exportDataset}</legend>
                <div className="yop-segmented yop-segmented--choices">
                  {datasets.map((d) => (
                    <label key={d} className="yop-choice">
                      <input
                        type="radio"
                        name="dataset"
                        value={d}
                        checked={dataset === d}
                        onChange={() => {
                          setDataset(d)
                          setChosen(DEFAULT_COLUMNS)
                        }}
                      />
                      <span>{d === 'members' ? t.datasetMembers : t.datasetApplications}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <fieldset className="yop-fieldset">
              <legend className="yop-label">{t.exportSelection}</legend>
              <div className="yop-form__row">
                <div>
                  <label className="yop-label yop-label--small" htmlFor={`${id}-scope`}>
                    {dataset === 'applications' ? t.colStage : t.colStatus}
                  </label>
                  {dataset === 'applications' ? (
                    <select
                      id={`${id}-scope`}
                      className="yop-input yop-select"
                      value={stage}
                      onChange={(e) => setStage(e.target.value)}
                    >
                      {STAGES.map((value) => (
                        <option key={value} value={value}>
                          {t[`stage_${value}` as keyof typeof t] as string}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      id={`${id}-scope`}
                      className="yop-input yop-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {MEMBER_STATUSES.map((value) => (
                        <option key={value} value={value}>
                          {t[`member_${value}` as keyof typeof t] as string}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="yop-label yop-label--small" htmlFor={`${id}-type`}>
                    {t.filterType}
                  </label>
                  <select
                    id={`${id}-type`}
                    className="yop-input yop-select"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="all">{t.typeAll}</option>
                    <option value="ordinary">{t.type_ordinary}</option>
                    <option value="supporting">{t.type_supporting}</option>
                  </select>
                </div>
                <div>
                  <label className="yop-label yop-label--small" htmlFor={`${id}-q`}>
                    {t.search}
                  </label>
                  <input
                    id={`${id}-q`}
                    className="yop-input"
                    type="search"
                    value={q}
                    maxLength={100}
                    placeholder={t.searchHint}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
              </div>
            </fieldset>
            <fieldset className="yop-fieldset">
              <legend className="yop-label">{t.exportColumns}</legend>
              <div className="yop-checks">
                {available.map((column) => (
                  <label key={column.key} className="yop-check">
                    <input
                      type="checkbox"
                      checked={chosen.includes(column.key)}
                      onChange={() => toggle(column.key)}
                    />
                    <span>{column.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label className="yop-label" htmlFor={`${id}-purpose`}>
                {t.exportPurpose}
              </label>
              <textarea
                id={`${id}-purpose`}
                className="yop-input yop-textarea"
                rows={3}
                maxLength={300}
                required
                aria-describedby={`${id}-purpose-hint`}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
              <p id={`${id}-purpose-hint`} className="yop-hint">
                {t.exportPurposeHint} ({purposeLength}/300)
              </p>
            </div>
            <div>
              <label className="yop-label" htmlFor={`${id}-basis`}>
                {t.exportLegalBasis}
              </label>
              <select
                id={`${id}-basis`}
                className="yop-input yop-select"
                value={basis}
                required
                disabled={!legalBases.length}
                onChange={(e) => setBasis(e.target.value)}
              >
                <option value="">{t.chooseOne}</option>
                {legalBases.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
            {message && (
              <Notice tone={message.tone} live>
                {message.text}
              </Notice>
            )}
            <div className="yop-form__actions">
              <button
                type="button"
                className="yop-button yop-button--primary"
                disabled={!ready || busy}
                onClick={() => void run()}
              >
                <Icon name="download" />
                {t.exportButton}
              </button>
              <span className="yop-hint">{t.exportCsvNote}</span>
            </div>
          </div>
        </section>
        <section className="yop-card" aria-labelledby={`${id}-recent`}>
          <div className="yop-card__head">
            <h2 id={`${id}-recent`}>{t.recentExports}</h2>
            <Link
              className="yop-link yop-card__more"
              href="/admin/collections/exports"
              prefetch={false}
            >
              {t.openRegister}
            </Link>
          </div>
          {recent.length ? (
            <ul className="yop-list">
              {recent.map((entry) => (
                <li key={entry.id}>
                  <Link href={`/admin/collections/exports/${entry.id}`} prefetch={false}>
                    <span className="yop-list__title">{entry.purpose}</span>
                    <span className="yop-list__meta">
                      {entry.dataset === 'members' ? t.datasetMembers : t.datasetApplications} ·{' '}
                      {fill(t.rowsLabel, { rows: entry.rows })} · <bdi>{entry.when}</bdi>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="yop-empty">{t.nothingYet}</p>
          )}
        </section>
      </div>
      <StepUpDialog open={stepUp} onClose={() => setStepUp(false)} onConfirmed={() => void run()} />
    </div>
  )
}
