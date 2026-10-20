import Link from 'next/link'
import type { ReactNode } from 'react'

import { fill, type adminTexts } from '../i18n'
import { Icon, type IconName } from '../icons'
import type { Stage } from '../../membership/stage'

type Texts = (typeof adminTexts)['de']

/** Tabs that are links (filters stay in the address, so a view can be bookmarked or shared). */
export function FilterTabs({
  label,
  items,
}: {
  label: string
  items: { key: string; label: string; count?: number; href: string; current: boolean }[]
}) {
  return (
    <nav className="yop-tabs" aria-label={label}>
      <ul>
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              prefetch={false}
              className="yop-tabs__item"
              aria-current={item.current ? 'page' : undefined}
            >
              <span>{item.label}</span>
              {item.count != null && <span className="yop-tabs__count">{item.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** A plain GET form: works without JavaScript and keeps the selection in the address. */
export function FilterForm({
  action,
  hidden,
  children,
  t,
  resetHref,
  search,
}: {
  action: string
  hidden: Record<string, string>
  children?: ReactNode
  t: Texts
  resetHref: string
  search: string
}) {
  return (
    <form className="yop-filters" method="get" action={action} role="search">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div className="yop-filters__field yop-filters__field--search">
        <label className="yop-label" htmlFor="yop-filter-q">
          {t.search}
        </label>
        <span className="yop-input-icon">
          <Icon name="search" />
          <input
            id="yop-filter-q"
            className="yop-input"
            type="search"
            name="q"
            defaultValue={search}
            placeholder={t.searchHint}
            autoComplete="off"
            maxLength={100}
          />
        </span>
      </div>
      {children}
      <div className="yop-filters__actions">
        <button type="submit" className="yop-button yop-button--primary">
          {t.applyFilters}
        </button>
        <Link href={resetHref} prefetch={false} className="yop-button yop-button--ghost">
          {t.resetFilters}
        </Link>
      </div>
    </form>
  )
}

export function SelectFilter({
  id,
  name,
  label,
  value,
  options,
}: {
  id: string
  name: string
  label: string
  value: string
  options: { value: string; label: string }[]
}) {
  return (
    <div className="yop-filters__field">
      <label className="yop-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} name={name} className="yop-input yop-select" defaultValue={value}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function Pager({
  t,
  page,
  pages,
  total,
  hrefFor,
}: {
  t: Texts
  page: number
  pages: number
  total: number
  hrefFor: (page: number) => string
}) {
  return (
    <div className="yop-pager">
      <p className="yop-pager__count" role="status">
        {fill(t.resultsCount, { count: total })}
        {pages > 1 && <> · {fill(t.pageOf, { page, pages })}</>}
      </p>
      {pages > 1 && (
        <nav className="yop-pager__nav" aria-label={fill(t.pageOf, { page, pages })}>
          {page > 1 ? (
            <Link
              className="yop-button yop-button--small"
              href={hrefFor(page - 1)}
              prefetch={false}
            >
              {t.previous}
            </Link>
          ) : null}
          {page < pages ? (
            <Link
              className="yop-button yop-button--small"
              href={hrefFor(page + 1)}
              prefetch={false}
            >
              {t.nextPage}
            </Link>
          ) : null}
        </nav>
      )}
    </div>
  )
}

const STAGE_TONE: Record<Stage, string> = {
  received: 'info',
  inReview: 'neutral',
  consentPending: 'warning',
  accepted: 'good',
  rejected: 'neutral',
}

export function StagePill({ stage, t }: { stage: Stage; t: Texts }) {
  return (
    <span className={`yop-pill yop-pill--${STAGE_TONE[stage]}`}>
      {t[`stage_${stage}` as keyof Texts]}
    </span>
  )
}

export function PageHead({
  title,
  lead,
  icon,
  actions,
}: {
  title: string
  lead: string
  icon: IconName
  actions?: ReactNode
}) {
  return (
    <div className="yop-page__head">
      <div>
        <h1 className="yop-page__title">
          <span className="yop-page__icon">
            <Icon name={icon} />
          </span>
          {title}
        </h1>
        <p className="yop-lead">{lead}</p>
      </div>
      {actions && <div className="yop-page__actions">{actions}</div>}
    </div>
  )
}
