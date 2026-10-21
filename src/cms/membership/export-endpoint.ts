import type { Endpoint, PayloadRequest, Where } from 'payload'

import { can, type Permission, type PermissionSubject } from '../access/permissions'
import { audit } from '../audit/log'
import { hasFreshStepUp, isVerifiedSession } from '../auth/session-state'
import { adminLanguage } from '../admin/i18n'
import { toCsv } from './csv'
import { cleanPurpose, exportTable, isExportDataset, type ExportDataset } from './export'
import { adminHref, notify, recipientsWith } from './notifications'
import { checkExport, type LegalBasisLike, type PurposeLike } from './purposes'
import {
  and,
  isMemberFilter,
  isStageFilter,
  memberWhere,
  MEMBERSHIP_TYPE_VALUES,
  searchWhere,
  stageWhere,
} from './stage'

const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

const READ_PERMISSION: Record<ExportDataset, Permission> = {
  applications: 'inbox.read',
  members: 'members.read',
}
const COLLECTION = {
  applications: 'membership-applications',
  members: 'members',
} as const

type Filter = { stage?: unknown; status?: unknown; type?: unknown; q?: unknown }

/** The same selection as the lists: stage or member status, type of membership, search text. */
export function exportWhere(dataset: ExportDataset, filter: Filter): Where {
  const type =
    typeof filter.type === 'string' && MEMBERSHIP_TYPE_VALUES.includes(filter.type)
      ? { membershipType: { equals: filter.type } }
      : null
  const search = searchWhere(typeof filter.q === 'string' ? filter.q : null)
  if (dataset === 'applications') {
    return and(stageWhere(isStageFilter(filter.stage) ? filter.stage : 'all'), type, search)
  }
  return and(isMemberFilter(filter.status) ? memberWhere(filter.status) : null, type, search)
}

/** Only the known filter keys and values go into the export register. */
export function cleanFilter(dataset: ExportDataset, filter: Filter) {
  const clean: Record<string, string> = {}
  if (dataset === 'applications' && isStageFilter(filter.stage)) clean.stage = filter.stage
  if (dataset === 'members' && isMemberFilter(filter.status)) clean.status = filter.status
  if (typeof filter.type === 'string' && MEMBERSHIP_TYPE_VALUES.includes(filter.type)) {
    clean.type = filter.type
  }
  // The search text may be a name: it is applied, but not stored.
  if (typeof filter.q === 'string' && filter.q.trim()) clean.search = 'yes'
  return clean
}

async function runExport(req: PayloadRequest): Promise<Response> {
  if (!req.user || !(await isVerifiedSession(req))) return json({ error: 'not_signed_in' }, 401)
  const person = req.user as PermissionSubject & { id: number; name?: string; role?: string }
  const body = ((await req.json?.().catch(() => null)) ?? {}) as {
    dataset?: unknown
    purposeId?: unknown
    columns?: unknown
    filter?: Filter
    purpose?: unknown
    confirmed?: unknown
    separator?: unknown
  }
  if (!isExportDataset(body.dataset)) return json({ error: 'dataset' }, 400)
  const dataset = body.dataset
  if (!can(person, 'personalData.export') || !can(person, READ_PERMISSION[dataset])) {
    return json({ error: 'not_allowed' }, 403)
  }
  if (!(await hasFreshStepUp(req))) return json({ error: 'step_up_required' }, 403)

  // Exports exist only for purposes the association has approved (none: exports are off).
  const approved = await req.payload.count({
    collection: 'processing-purposes',
    where: { and: [{ status: { equals: 'approved' } }, { dataset: { equals: dataset } }] },
    overrideAccess: true,
    req,
  })
  if (!approved.totalDocs) return json({ error: 'no_purposes' }, 409)
  const purposeId = Number(body.purposeId)
  const purpose = Number.isInteger(purposeId)
    ? ((await req.payload
        .findByID({
          collection: 'processing-purposes',
          id: purposeId,
          depth: 1,
          locale: 'de',
          overrideAccess: true,
          req,
        })
        .catch(() => null)) as (PurposeLike & { name?: string }) | null)
    : null
  const basis =
    purpose?.legalBasis && typeof purpose.legalBasis === 'object'
      ? (purpose.legalBasis as LegalBasisLike & { title?: string; article?: string })
      : null
  const check = checkExport(purpose, basis, dataset, body.columns)
  if (!check.ok) return json({ error: check.error }, 400)
  const columns = check.columns
  const occasion = cleanPurpose(body.purpose)
  if (!occasion) return json({ error: 'occasion' }, 400)
  if (body.confirmed !== true) return json({ error: 'confirm' }, 400)
  const separator = body.separator === ',' ? ',' : ';'

  const filter = body.filter ?? {}
  // With the person's own access rules (not overrideAccess): restrictions apply here too.
  const { docs } = await req.payload.find({
    collection: COLLECTION[dataset],
    where: exportWhere(dataset, filter),
    sort: dataset === 'members' ? 'lastName' : '-createdAt',
    pagination: false,
    depth: 0,
    overrideAccess: false,
    req,
  })
  const language = adminLanguage(req.i18n?.language)
  const table = exportTable(
    dataset,
    columns,
    docs as unknown as Record<string, unknown>[],
    language,
  )
  const csv = toCsv(table.header, table.rows, separator)

  const record = await req.payload.create({
    collection: 'exports',
    data: {
      dataset,
      rows: docs.length,
      processingPurpose: purposeId,
      processingPurposeName: purpose?.name ?? null,
      purpose: occasion,
      legalBasis: `${basis?.article ?? ''} – ${basis?.title ?? ''}`,
      legalBasisCode: basis?.code ?? null,
      columns: columns.map((column) => column.key),
      filter: cleanFilter(dataset, filter),
      actorId: Number(person.id),
      actorName: person.name ?? null,
      actorRole: person.role ?? null,
    },
    overrideAccess: true,
    depth: 0,
    req,
  })
  await audit(
    req.payload,
    {
      action: 'export.created',
      area: 'association',
      stepUp: true,
      target: { type: 'exports', id: record.id },
      detail: {
        dataset,
        rows: docs.length,
        columns: columns.map((column) => column.key),
        purposeId,
        legalBasis: basis?.code ?? null,
      },
    },
    req,
  )
  const reviewers = (await recipientsWith(req.payload, 'exports.review', req)).filter(
    (id) => id !== Number(person.id),
  )
  await notify(
    req.payload,
    {
      kind: 'exportCreated',
      recipients: reviewers,
      subjectType: 'exports',
      subjectId: record.id,
      href: adminHref('exports', record.id),
    },
    req,
  )

  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date())
  const name = dataset === 'members' ? 'mitglieder' : 'mitgliedsantraege'
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}-${day}.csv"`,
      'Cache-Control': 'no-store',
      'X-Export-Id': String(record.id),
      'X-Export-Rows': String(docs.length),
    },
  })
}

/**
 * POST /api/exports/run  { dataset, purposeId, columns, filter, purpose, confirmed, separator }
 * Needs `personalData.export`, read access to the dataset, a code from the last five minutes and
 * an approved processing purpose for the dataset whose columns cover the request; `purpose` is
 * the specific occasion (10–300 characters), `confirmed` the person's confirmation.
 */
export const exportEndpoints: Endpoint[] = [{ path: '/run', method: 'post', handler: runExport }]
