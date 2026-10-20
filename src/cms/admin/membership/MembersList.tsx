import { getTranslation } from '@payloadcms/translations'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ListViewServerProps, Where } from 'payload'

import { can, type PermissionSubject } from '../../access/permissions'
import { and, MEMBER_FILTERS, MEMBERSHIP_TYPE_VALUES, searchWhere } from '../../membership/stage'
import { adminLanguage, adminTexts, formatDate } from '../i18n'
import { Icon } from '../icons'
import { FilterForm, FilterTabs, PageHead, Pager, SelectFilter } from './list-ui'
import { adminRequest, listHref, pageParam, param, textParam } from './server'

const BASE = '/admin/collections/members'
const PAGE_SIZE = 25
const ORDER = ['name', 'since', 'newest'] as const
const MINOR = ['any', 'yes'] as const
const TYPES = ['all', ...MEMBERSHIP_TYPE_VALUES] as const

type Member = {
  id: number
  firstName?: string
  lastName?: string
  email?: string
  membershipType?: string
  status?: string
  memberSince?: string
  endedOn?: string | null
  minorAtAdmission?: boolean
  address?: { city?: string } | null
}

const statusWhere = (filter: (typeof MEMBER_FILTERS)[number]): Where | null =>
  filter === 'all' ? null : { status: { equals: filter } }

/**
 * The members register as a list (replaces Payload's list view): active/ended tabs with counts,
 * search, filters, sorting, and links to add a member by hand and to export.
 */
export async function MembersList(props: ListViewServerProps) {
  const { payload, searchParams, i18n, collectionConfig } = props
  const req = await adminRequest(payload)
  if (!req) redirect('/admin/login')
  const person = req.user as unknown as PermissionSubject & { id: number }
  const language = adminLanguage(i18n?.language)
  const t = adminTexts[language]
  const sp = searchParams as Record<string, string | string[] | undefined> | undefined

  const status = param(sp, 'status', MEMBER_FILTERS, 'active')
  const type = param(sp, 'type', TYPES, 'all')
  const minor = param(sp, 'minor', MINOR, 'any')
  const order = param(sp, 'order', ORDER, 'name')
  const q = textParam(sp, 'q')
  const page = pageParam(sp)
  const current: Record<string, string> = {
    status,
    type: type === 'all' ? '' : type,
    minor: minor === 'any' ? '' : minor,
    order: order === 'name' ? '' : order,
    q,
  }
  const access = { overrideAccess: false, req } as const
  const where = and(
    statusWhere(status),
    type === 'all' ? null : { membershipType: { equals: type } },
    minor === 'yes' ? { minorAtAdmission: { equals: true } } : null,
    searchWhere(q),
  )
  const sort = order === 'since' ? 'memberSince' : order === 'newest' ? '-memberSince' : 'lastName'
  const tabs = MEMBER_FILTERS
  const [result, ...counts] = await Promise.all([
    payload.find({
      collection: 'members',
      where,
      sort,
      page,
      limit: PAGE_SIZE,
      depth: 0,
      ...access,
      select: {
        firstName: true,
        lastName: true,
        email: true,
        membershipType: true,
        status: true,
        memberSince: true,
        endedOn: true,
        minorAtAdmission: true,
        address: true,
      },
    }),
    ...tabs.map((key) =>
      payload
        .count({ collection: 'members', where: and(statusWhere(key)), ...access })
        .then((r) => r.totalDocs),
    ),
  ])
  const docs = result.docs as unknown as Member[]
  const title = getTranslation(collectionConfig.labels.plural, i18n)

  return (
    <div className="yop-page yop-records-page">
      <PageHead
        title={title}
        lead={t.membersLead}
        icon="members"
        actions={
          <>
            {can(person, 'personalData.export') && (
              <Link
                className="yop-button"
                prefetch={false}
                href={listHref(
                  '/admin/export',
                  { dataset: 'members', status, type: type === 'all' ? '' : type, q },
                  {},
                )}
              >
                <Icon name="download" />
                {t.exportAction}
              </Link>
            )}
            {can(person, 'members.write') && (
              <Link
                className="yop-button yop-button--primary"
                prefetch={false}
                href={`${BASE}/create`}
              >
                <Icon name="plus" />
                {t.newMember}
              </Link>
            )}
          </>
        }
      />
      <FilterTabs
        label={t.colStatus}
        items={tabs.map((key, index) => ({
          key,
          label: String(t[`member_${key}` as keyof typeof t]),
          count: counts[index],
          href: listHref(BASE, current, { status: key, page: null }),
          current: key === status,
        }))}
      />
      <FilterForm
        action={BASE}
        hidden={{ status }}
        t={t}
        resetHref={listHref(BASE, {}, { status })}
        search={q}
      >
        <SelectFilter
          id="yop-filter-type"
          name="type"
          label={t.filterType}
          value={type}
          options={[
            { value: 'all', label: t.typeAll },
            { value: 'ordinary', label: t.type_ordinary },
            { value: 'supporting', label: t.type_supporting },
          ]}
        />
        <SelectFilter
          id="yop-filter-minor"
          name="minor"
          label={t.filterMinor}
          value={minor}
          options={[
            { value: 'any', label: t.minorAny },
            { value: 'yes', label: t.minorYes },
          ]}
        />
        <SelectFilter
          id="yop-filter-order"
          name="order"
          label={t.sortLabel}
          value={order}
          options={[
            { value: 'name', label: t.sortName },
            { value: 'since', label: t.sortSince },
            { value: 'newest', label: t.sortNewest },
          ]}
        />
      </FilterForm>

      <section className="yop-card yop-card--flush" aria-labelledby="yop-records-title">
        <h2 id="yop-records-title" className="yop-visually-hidden">
          {title}
        </h2>
        {docs.length ? (
          <div className="yop-table-wrap">
            <table className="yop-table yop-records">
              <thead>
                <tr>
                  <th scope="col">{t.colName}</th>
                  <th scope="col">{t.colCity}</th>
                  <th scope="col">{t.colType}</th>
                  <th scope="col">{t.colMemberSince}</th>
                  <th scope="col">{t.colStatus}</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id}>
                    <th scope="row" data-label={t.colName}>
                      <Link
                        href={`${BASE}/${doc.id}`}
                        prefetch={false}
                        className="yop-records__name"
                      >
                        <bdi>
                          {doc.lastName}, {doc.firstName}
                        </bdi>
                      </Link>
                      <span className="yop-records__sub">
                        <bdi>{doc.email}</bdi>
                      </span>
                    </th>
                    <td data-label={t.colCity}>
                      <bdi>{doc.address?.city ?? '—'}</bdi>
                    </td>
                    <td data-label={t.colType}>
                      {doc.membershipType === 'supporting' ? t.type_supporting : t.type_ordinary}
                    </td>
                    <td data-label={t.colMemberSince}>
                      <bdi>{doc.memberSince ? formatDate(doc.memberSince, language) : '—'}</bdi>
                    </td>
                    <td data-label={t.colStatus}>
                      <span className="yop-records__pills">
                        <span
                          className={`yop-pill ${doc.status === 'ended' ? 'yop-pill--neutral' : 'yop-pill--good'}`}
                        >
                          {doc.status === 'ended' ? t.member_ended : t.member_active}
                        </span>
                        {doc.status === 'ended' && doc.endedOn && (
                          <span className="yop-records__sub">
                            <bdi>{formatDate(doc.endedOn, language)}</bdi>
                          </span>
                        )}
                        {doc.minorAtAdmission && (
                          <span className="yop-pill yop-pill--info">{t.filterMinor}</span>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="yop-empty yop-empty--padded">{t.emptyList}</p>
        )}
      </section>
      <Pager
        t={t}
        page={result.page ?? 1}
        pages={result.totalPages}
        total={result.totalDocs}
        hrefFor={(next) => listHref(BASE, current, { page: String(next) })}
      />
    </div>
  )
}
