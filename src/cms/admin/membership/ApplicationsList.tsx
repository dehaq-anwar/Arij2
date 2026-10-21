import { getTranslation } from '@payloadcms/translations'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ListViewServerProps, Where } from 'payload'

import { can, type PermissionSubject } from '../../access/permissions'
import { monthsBefore, RETENTION_MONTHS } from '../../jobs/retention'
import { startOfTomorrowBerlin } from '../../jobs/membership-reminders'
import {
  and,
  MEMBERSHIP_TYPE_VALUES,
  OPEN_STATUSES,
  searchWhere,
  STAGE_FILTERS,
  stageOf,
  stageWhere,
  type StageFilter,
} from '../../membership/stage'
import { adminLanguage, adminTexts, fill, formatDate } from '../i18n'
import { Icon } from '../icons'
import { FilterForm, FilterTabs, PageHead, Pager, SelectFilter, StagePill } from './list-ui'
import {
  accountNames,
  adminRequest,
  listHref,
  pageParam,
  param,
  relationId,
  textParam,
} from './server'

const BASE = '/admin/collections/membership-applications'
const PAGE_SIZE = 25
const ASSIGNED = ['any', 'me', 'none'] as const
const FOLLOW_UP = ['any', 'due'] as const
const ORDER = ['newest', 'oldest', 'followUp'] as const
const TYPES = ['all', ...MEMBERSHIP_TYPE_VALUES] as const

type Application = {
  id: number
  firstName?: string
  lastName?: string
  email?: string
  membershipType?: string
  status?: string
  under18?: boolean
  guardian?: { consentReceivedAt?: string | null } | null
  createdAt: string
  decisionDate?: string | null
  followUpOn?: string | null
  assignedTo?: unknown
  personalDataMovedOn?: string | null
}

/**
 * The applications as a work list (replaces Payload's list view): tabs by stage with counts,
 * search, filters for type, assignment and due follow-ups, and a table that turns into cards on
 * a phone. Every query runs with the person's own access rules.
 */
export async function ApplicationsList(props: ListViewServerProps) {
  const { payload, searchParams, i18n, collectionConfig } = props
  const req = await adminRequest(payload)
  if (!req) redirect('/admin/login')
  const person = req.user as unknown as PermissionSubject & { id: number }
  const language = adminLanguage(i18n?.language)
  const t = adminTexts[language]
  const sp = searchParams as Record<string, string | string[] | undefined> | undefined

  const stage = param(sp, 'stage', STAGE_FILTERS, 'open')
  const type = param(sp, 'type', TYPES, 'all')
  const assigned = param(sp, 'assigned', ASSIGNED, 'any')
  const followUp = param(sp, 'followUp', FOLLOW_UP, 'any')
  const order = param(sp, 'order', ORDER, 'newest')
  const q = textParam(sp, 'q')
  const page = pageParam(sp)
  const current: Record<string, string> = {
    stage,
    type: type === 'all' ? '' : type,
    assigned: assigned === 'any' ? '' : assigned,
    followUp: followUp === 'any' ? '' : followUp,
    order: order === 'newest' ? '' : order,
    q,
  }

  const filters: (Where | null)[] = [
    type === 'all' ? null : { membershipType: { equals: type } },
    assigned === 'me'
      ? { assignedTo: { equals: person.id } }
      : assigned === 'none'
        ? { assignedTo: { exists: false } }
        : null,
    followUp === 'due'
      ? {
          and: [
            { status: { in: [...OPEN_STATUSES] } },
            { followUpOn: { less_than: startOfTomorrowBerlin().toISOString() } },
          ],
        }
      : null,
    searchWhere(q),
  ]
  const sort = order === 'oldest' ? 'createdAt' : order === 'followUp' ? 'followUpOn' : '-createdAt'
  const access = { overrideAccess: false, req } as const

  const tabs: StageFilter[] = [
    'open',
    'received',
    'inReview',
    'consentPending',
    'accepted',
    'rejected',
    'all',
  ]
  const [result, ...counts] = await Promise.all([
    payload.find({
      collection: 'membership-applications',
      where: and(stageWhere(stage), ...filters),
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
        under18: true,
        guardian: true,
        decisionDate: true,
        followUpOn: true,
        assignedTo: true,
        createdAt: true,
        personalDataMovedOn: true,
      },
    }),
    ...tabs.map((key) =>
      payload
        .count({ collection: 'membership-applications', where: and(stageWhere(key)), ...access })
        .then((r) => r.totalDocs),
    ),
  ])
  const docs = result.docs as unknown as Application[]
  // Applications whose personal data were moved to the register show the name from there
  // (only for those who may read the register).
  const moved = docs.filter((doc) => doc.personalDataMovedOn).map((doc) => doc.id)
  const registered = new Map<number, { firstName?: string | null; lastName?: string | null }>()
  if (moved.length && can(person, 'members.read')) {
    const { docs: members } = await payload.find({
      collection: 'members',
      where: { application: { in: moved } },
      limit: moved.length,
      depth: 0,
      ...access,
      select: { firstName: true, lastName: true, email: true, application: true },
    })
    for (const member of members) {
      const application = relationId(member.application)
      if (application) registered.set(Number(application), member)
    }
  }
  const names = await accountNames(
    payload,
    docs.map((doc) => relationId(doc.assignedTo)),
  )
  const today = new Date()
  const tomorrow = startOfTomorrowBerlin(today)
  const title = getTranslation(collectionConfig.labels.plural, i18n)
  const canExport = can(person, 'personalData.export')

  return (
    <div className="yop-page yop-records-page">
      <PageHead
        title={title}
        lead={t.applicationsLead}
        icon="apps"
        actions={
          canExport ? (
            <Link
              className="yop-button"
              prefetch={false}
              href={listHref(
                '/admin/export',
                { dataset: 'applications', stage, type: type === 'all' ? '' : type, q },
                {},
              )}
            >
              <Icon name="download" />
              {t.exportAction}
            </Link>
          ) : null
        }
      />
      <FilterTabs
        label={t.colStage}
        items={tabs.map((key, index) => ({
          key,
          label: String(t[`stage_${key}` as keyof typeof t]),
          count: counts[index],
          href: listHref(BASE, current, { stage: key, page: null }),
          current: key === stage,
        }))}
      />
      <FilterForm
        action={BASE}
        hidden={{ stage }}
        t={t}
        resetHref={listHref(BASE, {}, { stage })}
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
          id="yop-filter-assigned"
          name="assigned"
          label={t.filterAssigned}
          value={assigned}
          options={[
            { value: 'any', label: t.assignedAnyone },
            { value: 'me', label: t.assignedMe },
            { value: 'none', label: t.assignedNone },
          ]}
        />
        <SelectFilter
          id="yop-filter-followup"
          name="followUp"
          label={t.filterFollowUp}
          value={followUp}
          options={[
            { value: 'any', label: t.followUpAny },
            { value: 'due', label: t.followUpDue },
          ]}
        />
        <SelectFilter
          id="yop-filter-order"
          name="order"
          label={t.sortLabel}
          value={order}
          options={[
            { value: 'newest', label: t.sortNewest },
            { value: 'oldest', label: t.sortOldest },
            { value: 'followUp', label: t.sortFollowUp },
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
                  <th scope="col">{t.colType}</th>
                  <th scope="col">{t.colReceived}</th>
                  <th scope="col">{t.colStage}</th>
                  <th scope="col">{t.colAssigned}</th>
                  <th scope="col">{t.colFollowUp}</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => {
                  const docStage = stageOf(doc)
                  const assignee = names.get(relationId(doc.assignedTo) ?? -1)
                  const followUpAt = doc.followUpOn ? new Date(doc.followUpOn) : null
                  const due =
                    followUpAt &&
                    OPEN_STATUSES.includes(doc.status as never) &&
                    followUpAt < tomorrow
                  const overdue =
                    due && followUpAt && formatDate(followUpAt, 'de') !== formatDate(today, 'de')
                  const deletesOn =
                    doc.status === 'rejected' && doc.decisionDate
                      ? monthsBefore(new Date(doc.decisionDate), -RETENTION_MONTHS)
                      : null
                  return (
                    <tr key={doc.id}>
                      <th scope="row" data-label={t.colName}>
                        <Link
                          href={`${BASE}/${doc.id}`}
                          prefetch={false}
                          className="yop-records__name"
                        >
                          <bdi>
                            {doc.personalDataMovedOn
                              ? registered.has(doc.id)
                                ? `${registered.get(doc.id)!.lastName}, ${registered.get(doc.id)!.firstName}`
                                : fill(t.applicationNumber, { id: doc.id })
                              : `${doc.lastName}, ${doc.firstName}`}
                          </bdi>
                        </Link>
                        <span className="yop-records__sub">
                          {doc.personalDataMovedOn ? t.dataInRegister : <bdi>{doc.email}</bdi>}
                        </span>
                      </th>
                      <td data-label={t.colType}>
                        {doc.membershipType === 'supporting' ? t.type_supporting : t.type_ordinary}
                      </td>
                      <td data-label={t.colReceived}>
                        <bdi>{formatDate(doc.createdAt, language)}</bdi>
                      </td>
                      <td data-label={t.colStage}>
                        <span className="yop-records__pills">
                          <StagePill stage={docStage} t={t} />
                          {deletesOn && (
                            <span className="yop-records__sub">
                              {fill(t.deletesOn, { date: formatDate(deletesOn, language) })}
                            </span>
                          )}
                        </span>
                      </td>
                      <td data-label={t.colAssigned}>
                        {assignee ? (
                          <bdi>{assignee}</bdi>
                        ) : (
                          <span className="yop-muted">{t.unassigned}</span>
                        )}
                      </td>
                      <td data-label={t.colFollowUp}>
                        {followUpAt ? (
                          <span className={due ? 'yop-due' : undefined}>
                            <bdi>{formatDate(followUpAt, language)}</bdi>
                            {due && (
                              <span className="yop-pill yop-pill--warning">
                                {overdue ? t.overdue : t.dueToday}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="yop-muted">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
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
