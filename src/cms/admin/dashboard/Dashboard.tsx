import { getTranslation } from '@payloadcms/translations'
import Link from 'next/link'
import type { AdminViewServerProps, PayloadRequest, Where } from 'payload'

import { roleLabels } from '../../access/labels'
import { auditAreasOf, can, isRole, type PermissionSubject } from '../../access/permissions'
import { getCredential, unusedRecoveryCodes } from '../../auth/mfa'
import { listActiveSessions } from '../../auth/sessions'
import { startOfTomorrowBerlin } from '../../jobs/membership-reminders'
import { OPEN_STATUSES, stageWhere } from '../../membership/stage'
import { BACKUP_OVERDUE_MS } from '../../operations/alerts'
import { lastGoodBackupAt, readOperationsState } from '../../operations/collect'
import { actionLabel } from '../audit/actions'
import {
  adminLanguage,
  adminTexts,
  fill,
  formatDate,
  formatDateTime,
  greeting,
  type AdminLanguage,
} from '../i18n'
import { Icon, type IconName } from '../icons'
import { opsTexts } from '../operations/texts'

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

type Person = PermissionSubject & { id: number; name?: string; role?: string }

async function contentSummary(req: PayloadRequest) {
  const count = (collection: 'projects' | 'news', status: 'published' | 'draft') =>
    req.payload
      .count({ collection, where: { _status: { equals: status } }, overrideAccess: true })
      .then((r) => r.totalDocs)
  const [projectsLive, projectsDraft, newsLive, newsDraft, recentProjects, recentNews] =
    await Promise.all([
      count('projects', 'published'),
      count('projects', 'draft'),
      count('news', 'published'),
      count('news', 'draft'),
      req.payload.find({
        collection: 'projects',
        sort: '-updatedAt',
        limit: 4,
        depth: 0,
        draft: true,
        overrideAccess: true,
        select: { title: true, updatedAt: true, _status: true },
      }),
      req.payload.find({
        collection: 'news',
        sort: '-updatedAt',
        limit: 4,
        depth: 0,
        draft: true,
        overrideAccess: true,
        select: { title: true, updatedAt: true, _status: true },
      }),
    ])
  const recent = [
    ...recentProjects.docs.map((d) => ({ ...d, collection: 'projects' as const })),
    ...recentNews.docs.map((d) => ({ ...d, collection: 'news' as const })),
  ]
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 5)
  return { projectsLive, projectsDraft, newsLive, newsDraft, recent }
}

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

async function membershipPipeline(req: PayloadRequest) {
  const count = (where: Where | null) =>
    req.payload
      .count({ collection: 'membership-applications', where: where ?? {}, overrideAccess: true })
      .then((r) => r.totalDocs)
  const [received, inReview, consentPending, decided] = await Promise.all([
    count(stageWhere('received')),
    count(stageWhere('inReview')),
    count(stageWhere('consentPending')),
    count({
      and: [
        { status: { in: ['accepted', 'rejected'] } },
        { decisionDate: { greater_than: daysAgo(30) } },
      ],
    }),
  ])
  return { received, inReview, consentPending, decided }
}

async function myTasks(req: PayloadRequest, userId: number) {
  const { docs } = await req.payload.find({
    collection: 'membership-applications',
    where: {
      and: [
        { status: { in: [...OPEN_STATUSES] } },
        {
          or: [
            { assignedTo: { equals: userId } },
            {
              and: [
                { assignedTo: { exists: false } },
                { followUpOn: { less_than: startOfTomorrowBerlin().toISOString() } },
              ],
            },
          ],
        },
      ],
    },
    sort: 'followUpOn',
    limit: 6,
    depth: 0,
    overrideAccess: true,
    select: { firstName: true, lastName: true, followUpOn: true, status: true, assignedTo: true },
  })
  return docs as unknown as {
    id: number
    firstName: string
    lastName: string
    followUpOn?: string | null
    status: string
  }[]
}

/** Operations at a glance (CC-3): the last known state collected from the agent. */
async function operationsSummary(req: PayloadRequest) {
  const [state, lastBackup] = await Promise.all([
    readOperationsState(req.payload, req),
    lastGoodBackupAt(req.payload, req),
  ])
  const status = state.status ?? null
  const services = status?.agent.services ?? []
  const running = services.filter((service) =>
    status?.containers.some(
      (c) => c.service === service && c.state === 'running' && c.health !== 'unhealthy',
    ),
  ).length
  const days = (state.certificates ?? [])
    .map((c) => c.daysLeft)
    .filter((n): n is number => typeof n === 'number')
  return {
    configured: state.lastError !== 'not_configured' || Boolean(status),
    stale: Boolean(state.failingSince),
    running,
    total: services.length,
    backupConfigured: Boolean(status?.agent.backup.configured),
    lastBackup,
    // The same limit as the warning (src/cms/operations/alerts.ts).
    backupOverdue:
      Boolean(status?.agent.backup.configured) &&
      (!lastBackup || Date.now() - lastBackup.getTime() > BACKUP_OVERDUE_MS),
    certificateDays: days.length ? Math.min(...days) : null,
    certificatesOk: (state.certificates ?? []).every((c) => c.ok),
  }
}

async function membersSummary(req: PayloadRequest) {
  const yearStart = `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric' }).format(new Date())}-01-01T00:00:00.000Z`
  const [active, joined] = await Promise.all([
    req.payload.count({
      collection: 'members',
      where: { status: { equals: 'active' } },
      overrideAccess: true,
    }),
    req.payload.count({
      collection: 'members',
      where: { memberSince: { greater_than_equal: yearStart } },
      overrideAccess: true,
    }),
  ])
  return { active: active.totalDocs, joined: joined.totalDocs }
}

function Stat({
  icon,
  label,
  value,
  href,
  hint,
  tone,
  small,
}: {
  icon: IconName
  label: string
  value: number | string
  href?: string
  hint?: string
  tone?: 'warning'
  /** Words or a date instead of a number. */
  small?: boolean
}) {
  const body = (
    <>
      <span className="yop-stat__top">
        <span className="yop-stat__label">{label}</span>
        <span className={`yop-stat__icon${tone ? ` yop-stat__icon--${tone}` : ''}`}>
          <Icon name={icon} />
        </span>
      </span>
      <span className={`yop-stat__value${small ? ' yop-stat__value--small' : ''}`}>{value}</span>
      {hint && <span className="yop-stat__hint">{hint}</span>}
    </>
  )
  return href ? (
    <Link href={href} prefetch={false} className="yop-card yop-stat yop-stat--link">
      {body}
    </Link>
  ) : (
    <div className="yop-card yop-stat">{body}</div>
  )
}

/**
 * The Control Center's start page. Everything on it is read from the database for the signed-in
 * person and limited to what their role may see; sections for areas that are not built yet
 * (e-mail, analytics) are left out instead of being shown with sample data.
 */
export async function Dashboard({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  const person = req.user as unknown as Person | null
  const language: AdminLanguage = adminLanguage(req.i18n?.language)
  const t = adminTexts[language]
  if (!person) return null

  const [credential, sessions] = await Promise.all([
    getCredential(req.payload, person.id),
    listActiveSessions(req.payload, person.id),
  ])
  const showInbox = can(person, 'inbox.read')
  const showContent = can(person, 'content.read')
  const showUsers = can(person, 'users.read')
  const areas = auditAreasOf(person)

  const [inbox, content, activity, failedSignIns, accounts] = await Promise.all([
    showInbox
      ? Promise.all([
          req.payload.count({
            collection: 'membership-applications',
            where: { status: { in: [...OPEN_STATUSES] } },
            overrideAccess: true,
          }),
          req.payload.count({
            collection: 'contact-messages',
            where: { status: { equals: 'new' } },
            overrideAccess: true,
          }),
        ])
      : null,
    showContent ? contentSummary(req) : null,
    areas.length
      ? req.payload.find({
          collection: 'audit-log',
          where: { area: { in: [...areas] } } as Where,
          sort: '-createdAt',
          limit: 7,
          depth: 0,
          overrideAccess: true,
        })
      : null,
    areas.includes('security')
      ? req.payload.count({
          collection: 'audit-log',
          where: {
            action: {
              in: [
                'auth.password_failed',
                'auth.mfa_failed',
                'auth.mfa_locked',
                'auth.account_locked',
              ],
            },
            createdAt: { greater_than: hoursAgo(24) },
          },
          overrideAccess: true,
        })
      : null,
    showUsers
      ? Promise.all([
          req.payload.find({
            collection: 'users',
            limit: 200,
            depth: 0,
            overrideAccess: true,
            select: { name: true },
          }),
          req.payload.find({
            collection: 'auth-mfa',
            limit: 200,
            depth: 0,
            overrideAccess: true,
            select: { user: true },
          }),
        ])
      : null,
  ])

  const [pipeline, tasks, members, operations] = await Promise.all([
    showInbox ? membershipPipeline(req) : null,
    showInbox ? myTasks(req, person.id) : null,
    can(person, 'members.read') ? membersSummary(req) : null,
    can(person, 'operations.read') ? operationsSummary(req) : null,
  ])
  const o = opsTexts[language]

  const recoveryLeft = credential ? unusedRecoveryCodes(credential) : 0
  const withoutMfa = accounts
    ? accounts[0].docs.filter(
        (user) =>
          !accounts[1].docs.some((c) => {
            const owner = (c as { user: number | { id: number } }).user
            return (typeof owner === 'object' ? owner.id : owner) === user.id
          }),
      ).length
    : 0

  return (
    <div className="yop-page">
      <div className="yop-page__head">
        <div>
          <p className="yop-eyebrow">{formatDate(new Date(), language)}</p>
          <h1>
            {greeting(t)}
            {person.name ? `, ${person.name.split(' ')[0]}` : ''}
          </h1>
          <p className="yop-lead">
            {t.yourRole}:{' '}
            {isRole(person.role) ? getTranslation(roleLabels[person.role], req.i18n) : '—'}
          </p>
        </div>
        <div className="yop-page__actions">
          {can(person, 'content.write') && (
            <>
              <Link className="yop-button" href="/admin/collections/news/create" prefetch={false}>
                <Icon name="plus" />
                {t.newPost}
              </Link>
              <Link
                className="yop-button yop-button--primary"
                href="/admin/collections/projects/create"
                prefetch={false}
              >
                <Icon name="plus" />
                {t.newProject}
              </Link>
            </>
          )}
        </div>
      </div>

      <section className="yop-grid yop-grid--stats" aria-label={t.quickActions}>
        <Stat
          icon="device"
          label={t.activeSessions}
          value={sessions.length}
          href="/admin/security"
        />
        {inbox && (
          <>
            <Stat
              icon="apps"
              label={t.openApplications}
              value={inbox[0].totalDocs}
              href="/admin/collections/membership-applications?stage=open"
            />
            <Stat
              icon="inbox"
              label={t.newMessages}
              value={inbox[1].totalDocs}
              href="/admin/collections/contact-messages?where[status][equals]=new"
            />
          </>
        )}
        {failedSignIns && (
          <Stat
            icon="alert"
            label={t.failedSignIns}
            value={failedSignIns.totalDocs}
            href="/admin/collections/audit-log?where[area][equals]=security"
            tone={failedSignIns.totalDocs > 0 ? 'warning' : undefined}
          />
        )}
        {operations && (
          <>
            <Stat
              icon="server"
              label={o.dashServices}
              value={
                operations.total
                  ? fill(o.dashServicesValue, {
                      running: operations.running,
                      total: operations.total,
                    })
                  : o.notSetUp
              }
              href="/admin/operations"
              small
              hint={operations.stale ? o.agentDownTitle : undefined}
              tone={
                operations.stale || (operations.total && operations.running < operations.total)
                  ? 'warning'
                  : undefined
              }
            />
            <Stat
              icon="backup"
              label={o.dashLastBackup}
              value={
                operations.lastBackup
                  ? formatDateTime(operations.lastBackup, language)
                  : operations.backupConfigured
                    ? o.never
                    : o.notSetUp
              }
              href="/admin/operations/backups"
              small
              tone={operations.backupOverdue ? 'warning' : undefined}
            />
            <Stat
              icon="lock"
              label={o.dashCertificates}
              value={
                operations.certificateDays != null
                  ? fill(o.dashCertificatesValue, { n: operations.certificateDays })
                  : o.notSetUp
              }
              href="/admin/operations/domains"
              small
              tone={operations.certificatesOk ? undefined : 'warning'}
            />
          </>
        )}
        {accounts && (
          <Stat
            icon="users"
            label={t.accounts}
            value={accounts[0].totalDocs}
            href="/admin/collections/users"
            hint={withoutMfa ? `${withoutMfa} ${t.accountsWithoutMfa}` : undefined}
            tone={withoutMfa ? 'warning' : undefined}
          />
        )}
      </section>

      {(pipeline || members) && (
        <div className="yop-grid yop-grid--main">
          {pipeline && (
            <section className="yop-card" aria-labelledby="yop-pipeline-title">
              <div className="yop-card__head">
                <h2 id="yop-pipeline-title">{t.pipelineTitle}</h2>
                <span className="yop-card__sub">{t.pipelineHint}</span>
                <Link
                  className="yop-link yop-card__more"
                  href="/admin/collections/membership-applications"
                  prefetch={false}
                >
                  {t.openApplicationsList}
                </Link>
              </div>
              <ol className="yop-pipeline">
                {(
                  [
                    ['received', pipeline.received, 'received'],
                    ['inReview', pipeline.inReview, 'inReview'],
                    ['consentPending', pipeline.consentPending, 'consentPending'],
                  ] as const
                ).map(([key, value, stage]) => (
                  <li key={key}>
                    <Link
                      href={`/admin/collections/membership-applications?stage=${stage}`}
                      prefetch={false}
                      className={`yop-pipeline__step${key === 'consentPending' && value > 0 ? ' yop-pipeline__step--warning' : ''}`}
                    >
                      <span className="yop-pipeline__value">{value}</span>
                      <span className="yop-pipeline__label">{t[`stage_${key}`]}</span>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/admin/collections/membership-applications?stage=accepted"
                    prefetch={false}
                    className="yop-pipeline__step yop-pipeline__step--done"
                  >
                    <span className="yop-pipeline__value">{pipeline.decided}</span>
                    <span className="yop-pipeline__label">{t.decided30}</span>
                  </Link>
                </li>
              </ol>
              <h3 className="yop-subhead">{t.myTasks}</h3>
              {tasks?.length ? (
                <ul className="yop-list">
                  {tasks.map((task) => (
                    <li key={task.id}>
                      <Link
                        href={`/admin/collections/membership-applications/${task.id}`}
                        prefetch={false}
                      >
                        <bdi className="yop-list__title">
                          {task.lastName}, {task.firstName}
                        </bdi>
                        <span className="yop-list__meta">
                          {t[`stage_${task.status === 'inReview' ? 'inReview' : 'received'}`]}
                          {task.followUpOn ? (
                            <>
                              {' · '}
                              {t.colFollowUp}: <bdi>{formatDate(task.followUpOn, language)}</bdi>
                            </>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="yop-empty">{t.noTasks}</p>
              )}
            </section>
          )}
          {members && (
            <section className="yop-card" aria-labelledby="yop-members-title">
              <div className="yop-card__head">
                <h2 id="yop-members-title">{t.membersCard}</h2>
                <Link
                  className="yop-link yop-card__more"
                  href="/admin/collections/members"
                  prefetch={false}
                >
                  {t.openRegisterList}
                </Link>
              </div>
              <div className="yop-split">
                <Link
                  href="/admin/collections/members?status=active"
                  prefetch={false}
                  className="yop-split__item"
                >
                  <span className="yop-split__label">{t.membersActiveLabel}</span>
                  <span className="yop-split__value">{members.active}</span>
                  <span className="yop-stat__hint">
                    {fill(t.joinedThisYear, { count: members.joined })}
                  </span>
                </Link>
              </div>
            </section>
          )}
        </div>
      )}

      <div className="yop-grid yop-grid--main">
        {content && (
          <section className="yop-card" aria-labelledby="yop-content-title">
            <div className="yop-card__head">
              <h2 id="yop-content-title">{t.contentCard}</h2>
            </div>
            <div className="yop-split">
              <Link href="/admin/collections/projects" prefetch={false} className="yop-split__item">
                <span className="yop-split__label">{t.projects}</span>
                <span className="yop-split__value">{content.projectsLive}</span>
                <span className="yop-stat__hint">
                  {t.published} · {content.projectsDraft} {t.drafts}
                </span>
              </Link>
              <Link href="/admin/collections/news" prefetch={false} className="yop-split__item">
                <span className="yop-split__label">{t.news}</span>
                <span className="yop-split__value">{content.newsLive}</span>
                <span className="yop-stat__hint">
                  {t.published} · {content.newsDraft} {t.drafts}
                </span>
              </Link>
            </div>
            <h3 className="yop-subhead">{t.recentlyEdited}</h3>
            {content.recent.length ? (
              <ul className="yop-list">
                {content.recent.map((doc) => (
                  <li key={`${doc.collection}-${doc.id}`}>
                    <Link href={`/admin/collections/${doc.collection}/${doc.id}`} prefetch={false}>
                      <bdi className="yop-list__title">{String(doc.title ?? doc.id)}</bdi>
                      <span className="yop-list__meta">
                        {doc.collection === 'projects' ? t.projects : t.news} ·{' '}
                        <bdi>{formatDateTime(String(doc.updatedAt), language)}</bdi>
                      </span>
                    </Link>
                    <span
                      className={`yop-pill ${doc._status === 'published' ? 'yop-pill--good' : 'yop-pill--neutral'}`}
                    >
                      {doc._status === 'published' ? t.live : t.draft}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="yop-empty">{t.nothingYet}</p>
            )}
          </section>
        )}

        <div className="yop-grid">
          <section className="yop-card yop-account-card" aria-labelledby="yop-account-title">
            <div className="yop-card__head">
              <h2 id="yop-account-title">{t.accountCard}</h2>
              <span className="yop-pill yop-pill--good">
                <Icon name="check" />
                {t.twoFactorOn}
              </span>
            </div>
            <dl className="yop-facts">
              <div>
                <dt>{t.activeSince}</dt>
                <dd>{credential ? formatDate(credential.enabledAt, language) : '—'}</dd>
              </div>
              <div>
                <dt>{t.recoveryCodes}</dt>
                <dd>{recoveryLeft} / 10</dd>
              </div>
            </dl>
            <Link
              className="yop-button yop-button--small yop-account-card__link"
              href="/admin/security"
              prefetch={false}
            >
              <Icon name="key" />
              {t.manageSecurity}
            </Link>
          </section>
          {activity && (
            <section className="yop-card" aria-labelledby="yop-activity-title">
              <div className="yop-card__head">
                <h2 id="yop-activity-title">{t.activity}</h2>
                <span className="yop-card__sub">{t.activityHint}</span>
                <Link
                  className="yop-link yop-card__more"
                  href="/admin/collections/audit-log"
                  prefetch={false}
                >
                  {t.showAll}
                </Link>
              </div>
              {activity.docs.length ? (
                <ol className="yop-timeline">
                  {activity.docs.map((entry) => (
                    <li
                      key={entry.id}
                      className={entry.result !== 'ok' ? 'yop-timeline__item--warn' : undefined}
                    >
                      <span className="yop-timeline__title">
                        {actionLabel(entry.action, language)}
                      </span>
                      <span className="yop-list__meta">
                        {[
                          entry.actorName || t.cellSystem,
                          ...(entry.targetLabel && entry.targetLabel !== entry.actorName
                            ? [entry.targetLabel]
                            : []),
                        ].map((name, index) => (
                          <span key={index}>
                            {index > 0 && ' → '}
                            <bdi>{name}</bdi>
                          </span>
                        ))}
                        {' · '}
                        <bdi>{formatDateTime(entry.createdAt, language)}</bdi>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="yop-empty">{t.nothingYet}</p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
