import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'

import { can, type PermissionSubject } from '../../access/permissions'
import { currentSession } from '../../auth/session-state'
import { EXPORT_COLUMNS, type ExportDataset } from '../../membership/export'
import { purposeColumnKeys, type PurposeLike } from '../../membership/purposes'
import { isMemberFilter, isStageFilter, MEMBERSHIP_TYPE_VALUES } from '../../membership/stage'
import { adminLanguage, adminTexts, formatDate, formatDateTime } from '../i18n'
import { ExportClient } from './ExportClient'

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/**
 * Export of personal data: dataset, an approved processing purpose (with its legal basis), the
 * purpose's columns, selection, the specific occasion and a confirmation, then a code.
 * Payload renders custom views without checking the sign-in, so this view checks it itself; the
 * endpoint checks everything again.
 */
export async function ExportView(props: AdminViewServerProps) {
  const { initPageResult, params, searchParams } = props
  const { req } = initPageResult
  const session = req.user ? await currentSession(req) : null
  if (!req.user || !session) redirect('/admin/login?redirect=%2Fadmin%2Fexport')
  const person = req.user as unknown as PermissionSubject & { id: number }
  const language = adminLanguage(req.i18n?.language)
  const t = adminTexts[language]

  const datasets: ExportDataset[] = can(person, 'personalData.export')
    ? ([
        can(person, 'inbox.read') ? 'applications' : null,
        can(person, 'members.read') ? 'members' : null,
      ].filter(Boolean) as ExportDataset[])
    : []

  const [purposes, recent, drafts] = datasets.length
    ? await Promise.all([
        req.payload.find({
          collection: 'processing-purposes',
          where: { and: [{ status: { equals: 'approved' } }, { dataset: { in: datasets } }] },
          sort: 'name',
          limit: 100,
          depth: 1,
          locale: language,
          fallbackLocale: 'de',
          overrideAccess: true,
          req,
        }),
        req.payload.find({
          collection: 'exports',
          where: { actorId: { equals: person.id } },
          sort: '-createdAt',
          limit: 5,
          depth: 0,
          overrideAccess: true,
          req,
        }),
        can(person, 'settings.manage')
          ? req.payload.count({
              collection: 'processing-purposes',
              where: { status: { equals: 'draft' } },
              overrideAccess: true,
              req,
            })
          : Promise.resolve({ totalDocs: 0 }),
      ])
    : [null, null, { totalDocs: 0 }]

  const sp = (searchParams ?? {}) as Record<string, string | string[] | undefined>
  const requested = one(sp.dataset)
  const dataset = datasets.find((d) => d === requested) ?? datasets[0] ?? 'applications'
  const stage = one(sp.stage)
  const status = one(sp.status)
  const type = one(sp.type)

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={req.payload}
      permissions={initPageResult.permissions}
      req={req}
      searchParams={searchParams}
      user={req.user}
      // The header actions (the notification bell), as Payload passes them to its own views.
      viewActions={req.payload.config.admin?.components?.actions}
      visibleEntities={initPageResult.visibleEntities}
    >
      <ExportClient
        datasets={datasets}
        initial={{
          dataset,
          stage: isStageFilter(stage) ? stage : 'all',
          status: isMemberFilter(status) ? status : 'active',
          type: type && MEMBERSHIP_TYPE_VALUES.includes(type) ? type : 'all',
          q: (one(sp.q) ?? '').slice(0, 100),
        }}
        columns={Object.fromEntries(
          datasets.map((d) => [
            d,
            EXPORT_COLUMNS[d].map((column) => ({ key: column.key, label: column.label[language] })),
          ]),
        )}
        purposes={(purposes?.docs ?? []).map((doc) => {
          const basis = (
            doc.legalBasis && typeof doc.legalBasis === 'object' ? doc.legalBasis : {}
          ) as { code?: string; title?: string; article?: string; explanation?: string }
          return {
            id: doc.id as number,
            dataset: doc.dataset as ExportDataset,
            name: String(doc.name ?? ''),
            description: (doc.description as string | null) ?? '',
            justification: String(doc.justification ?? ''),
            columns: purposeColumnKeys(doc as PurposeLike),
            decision: String(doc.decisionReference ?? ''),
            approvedOn: doc.approvedOn ? formatDate(doc.approvedOn as string, language) : '',
            basis: {
              code: basis.code ?? '',
              title: basis.title ?? '',
              article: basis.article ?? '',
              explanation: basis.explanation ?? '',
            },
          }
        })}
        canManagePurposes={can(person, 'settings.manage')}
        draftPurposes={drafts.totalDocs}
        recent={(recent?.docs ?? []).map((doc) => ({
          id: doc.id as number,
          when: formatDateTime(doc.createdAt as string, language),
          dataset: doc.dataset as ExportDataset,
          rows: doc.rows as number,
          purpose: doc.purpose as string,
          purposeName: (doc.processingPurposeName as string | null) ?? '',
        }))}
        notAllowed={datasets.length === 0 ? t.exportNotAllowed : null}
      />
    </DefaultTemplate>
  )
}
