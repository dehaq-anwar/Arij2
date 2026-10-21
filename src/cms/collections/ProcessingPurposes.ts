import type {
  Access,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionConfig,
  Endpoint,
} from 'payload'

import { allowed } from '../access/roles'
import { audit } from '../audit/log'
import { hasFreshStepUp, isVerifiedSession } from '../auth/session-state'
import { refuse } from '../lib/errors'
import { groups, label, localizedMessage } from '../lib/labels'
import { EXPORT_DATASETS } from '../membership/export'
import {
  approvalProblems,
  changesSubstance,
  columnOptions,
  foreignColumns,
  PURPOSE_STATUSES,
  type LegalBasisLike,
  type PurposeLike,
} from '../membership/purposes'
import { hiddenForExports, readForExports } from './LegalBases'

/** Set by the approval endpoints; ordinary edits never change the approval fields. */
const APPROVAL = 'purposeApproval'

const manage: Access = ({ req }) => allowed(req, 'settings.manage')
/** Drafts can be deleted; an approved or retired purpose is part of the export history. */
const deleteDrafts: Access = async ({ req }) =>
  (await allowed(req, 'settings.manage')) ? { status: { equals: 'draft' } } : false

const APPROVAL_FIELDS = ['status', 'decisionReference', 'approvedOn', 'approvedByName'] as const

/**
 * The approval fields are set only by the approval endpoints (they are read-only on the screen
 * and kept here against changes through the API). New purposes start as drafts. Changing what the approval covers (dataset, legal basis,
 * justification, columns) takes an approved purpose back to draft, so it must be approved again.
 */
const guardApproval: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  if (req.context?.[APPROVAL]) return data
  if (operation === 'create') {
    return {
      ...data,
      status: 'draft',
      decisionReference: null,
      approvedOn: null,
      approvedByName: null,
    }
  }
  const previous = (originalDoc ?? {}) as PurposeLike
  const kept = Object.fromEntries(
    APPROVAL_FIELDS.map((field) => [field, (originalDoc as Record<string, unknown>)?.[field]]),
  )
  const next = { ...data, ...kept }
  if (previous.status === 'approved' && changesSubstance(previous, next as PurposeLike)) {
    return {
      ...next,
      status: 'draft',
      decisionReference: null,
      approvedOn: null,
      approvedByName: null,
    }
  }
  return next
}

/** A purpose that was used for an export stays (the register refers to it); retire it instead. */
const keepIfUsed: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const used = await req.payload.count({
    collection: 'exports',
    where: { processingPurpose: { equals: id } },
    overrideAccess: true,
    req,
  })
  if (used.totalDocs) {
    throw refuse(
      req,
      label(
        'Dieser Zweck wurde bereits für Exporte verwendet und bleibt deshalb erhalten. Er kann zurückgezogen werden.',
        'This purpose has been used for exports and is therefore kept. It can be retired.',
        'استُخدم هذا الغرض في عمليات تصدير، لذلك يبقى محفوظًا. يمكن سحبه.',
      ),
      409,
    )
  }
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

/** POST /:id/approve { decisionReference }, /:id/retire, /:id/reopen — settings.manage + code. */
function approvalEndpoint(action: 'approve' | 'retire' | 'reopen'): Endpoint {
  return {
    path: `/:id/${action}`,
    method: 'post',
    handler: async (req) => {
      if (!req.user || !(await isVerifiedSession(req))) return json({ error: 'not_signed_in' }, 401)
      if (!(await allowed(req, 'settings.manage'))) return json({ error: 'not_allowed' }, 403)
      if (!(await hasFreshStepUp(req))) return json({ error: 'step_up_required' }, 403)
      const id = Number(req.routeParams?.id)
      if (!Number.isInteger(id)) return json({ error: 'not_found' }, 404)
      const purpose = (await req.payload
        .findByID({ collection: 'processing-purposes', id, depth: 1, overrideAccess: true, req })
        .catch(() => null)) as (PurposeLike & { status: string }) | null
      if (!purpose) return json({ error: 'not_found' }, 404)

      let data: Record<string, unknown>
      if (action === 'approve') {
        if (purpose.status !== 'draft') return json({ error: 'not_draft' }, 409)
        const body = ((await req.json?.().catch(() => null)) ?? {}) as {
          decisionReference?: unknown
        }
        const reference =
          typeof body.decisionReference === 'string'
            ? body.decisionReference.replace(/\s+/g, ' ').trim()
            : ''
        const basis =
          purpose.legalBasis && typeof purpose.legalBasis === 'object'
            ? (purpose.legalBasis as LegalBasisLike)
            : null
        const problems = approvalProblems(purpose, basis, reference)
        if (problems.length) return json({ error: 'incomplete', problems }, 400)
        data = {
          status: 'approved',
          decisionReference: reference.slice(0, 200),
          approvedOn: new Date().toISOString(),
          approvedByName: (req.user as { name?: string }).name ?? null,
        }
      } else if (action === 'retire') {
        if (purpose.status !== 'approved') return json({ error: 'not_approved' }, 409)
        data = { status: 'retired' }
      } else {
        if (purpose.status !== 'retired') return json({ error: 'not_retired' }, 409)
        data = { status: 'draft', decisionReference: null, approvedOn: null, approvedByName: null }
      }
      await req.payload.update({
        collection: 'processing-purposes',
        id,
        data,
        overrideAccess: true,
        context: { [APPROVAL]: true },
        req,
      })
      await audit(
        req.payload,
        {
          action: `purpose.${action}`,
          area: 'association',
          stepUp: true,
          target: { type: 'processing-purposes', id },
          detail: action === 'approve' ? { decisionReference: data.decisionReference } : {},
        },
        req,
      )
      return json({ ok: true, status: data.status })
    },
  }
}

/**
 * Processing purposes (Verarbeitungszwecke) for exports of personal data. Exports are only
 * possible for an approved purpose and only with its columns; until the association has
 * approved at least one purpose, there are no exports at all (also in production).
 */
export const ProcessingPurposes: CollectionConfig = {
  slug: 'processing-purposes',
  labels: {
    singular: label('Verarbeitungszweck', 'Processing purpose', 'غرض المعالجة'),
    plural: label('Verarbeitungszwecke', 'Processing purposes', 'أغراض المعالجة'),
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'dataset', 'legalBasis', 'status', 'approvedOn'],
    group: groups.admin,
    hidden: hiddenForExports,
    description: label(
      'Wofür personenbezogene Daten exportiert werden dürfen. Jeder Zweck nennt seine Rechtsgrundlage und die nötigen Spalten und muss vom Verein beschlossen und hier freigegeben werden. Ohne freigegebenen Zweck ist kein Export möglich.',
      'What personal data may be exported for. Each purpose names its legal basis and the columns it needs, and must be decided by the association and approved here. Without an approved purpose there are no exports.',
      'الأغراض التي يجوز تصدير البيانات الشخصية من أجلها. يحدد كل غرض أساسه القانوني والأعمدة اللازمة، ويجب أن تقرّه الجمعية ويُعتمد هنا. لا تصدير دون غرض معتمد.',
    ),
  },
  defaultSort: 'name',
  access: { read: readForExports, create: manage, update: manage, delete: deleteDrafts },
  hooks: { beforeChange: [guardApproval], beforeDelete: [keepIfUsed] },
  endpoints: [approvalEndpoint('approve'), approvalEndpoint('retire'), approvalEndpoint('reopen')],
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
      maxLength: 120,
      label: label('Bezeichnung', 'Name', 'التسمية'),
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      maxLength: 600,
      label: label('Beschreibung', 'Description', 'الوصف'),
      admin: {
        rows: 3,
        description: label(
          'Wofür werden die Daten gebraucht, von wem, wie lange?',
          'What are the data needed for, by whom, for how long?',
          'لماذا تُحتاج البيانات، ومن سيستخدمها، وإلى متى؟',
        ),
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'dataset',
          type: 'select',
          required: true,
          label: label('Daten', 'Data', 'البيانات'),
          options: EXPORT_DATASETS.map((value) => ({
            value,
            label:
              value === 'members'
                ? label('Mitglieder', 'Members', 'الأعضاء')
                : label('Mitgliedsanträge', 'Membership applications', 'طلبات العضوية'),
          })),
        },
        {
          name: 'legalBasis',
          type: 'relationship',
          relationTo: 'legal-bases',
          required: true,
          label: label('Rechtsgrundlage', 'Legal basis', 'الأساس القانوني'),
          filterOptions: { available: { equals: true } },
        },
      ],
    },
    {
      name: 'justification',
      type: 'textarea',
      required: true,
      maxLength: 1500,
      label: label(
        'Warum passt diese Rechtsgrundlage?',
        'Why does this legal basis fit?',
        'لماذا يناسب هذا الأساس القانوني؟',
      ),
      admin: {
        rows: 4,
        description: label(
          'Begründung des Vereins, z. B. die Satzungsbestimmung, die gesetzliche Pflicht oder die Abwägung. Mindestens 20 Zeichen.',
          'The association’s reasons, e.g. the provision of the statutes, the legal obligation or the balancing test. At least 20 characters.',
          'تبرير الجمعية، مثل بند النظام الأساسي أو الالتزام القانوني أو الموازنة. 20 حرفًا على الأقل.',
        ),
      },
    },
    {
      name: 'columns',
      type: 'select',
      hasMany: true,
      required: true,
      label: label('Erlaubte Spalten', 'Allowed columns', 'الأعمدة المسموح بها'),
      options: columnOptions(),
      admin: {
        description: label(
          'Nur was der Zweck wirklich braucht. Beim Export sind nur diese Spalten wählbar.',
          'Only what the purpose really needs. Exports can only contain these columns.',
          'فقط ما يحتاجه الغرض فعلًا. لا يمكن تصدير سوى هذه الأعمدة.',
        ),
      },
      validate: (value, { siblingData, req }) => {
        const dataset = (siblingData as { dataset?: unknown } | undefined)?.dataset
        if (!Array.isArray(value) || !value.length) {
          return localizedMessage(
            label(
              'Bitte mindestens eine Spalte wählen.',
              'Please choose at least one column.',
              'يرجى اختيار عمود واحد على الأقل.',
            ),
            req,
          )
        }
        const foreign = foreignColumns(dataset, value)
        return foreign.length
          ? `${localizedMessage(
              label(
                'Diese Spalten gibt es bei den gewählten Daten nicht:',
                'These columns do not exist for the chosen data:',
                'هذه الأعمدة غير موجودة في البيانات المختارة:',
              ),
              req,
            )} ${foreign.join(', ')}`
          : true
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      label: label('Stand', 'Status', 'الحالة'),
      options: PURPOSE_STATUSES.map((value) => ({
        value,
        label: {
          draft: label('Entwurf', 'Draft', 'مسودة'),
          approved: label('Freigegeben', 'Approved', 'معتمد'),
          retired: label('Zurückgezogen', 'Retired', 'مسحوب'),
        }[value],
      })),
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'approvalPanel',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '/cms/admin/membership/PurposePanel#PurposePanel' },
      },
    },
    {
      name: 'decisionReference',
      type: 'text',
      maxLength: 200,
      label: label('Beschluss', 'Decision', 'القرار'),
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'approvedOn',
      type: 'date',
      label: label('Freigegeben am', 'Approved on', 'تاريخ الاعتماد'),
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'approvedByName',
      type: 'text',
      label: label('Freigegeben von', 'Approved by', 'اعتمده'),
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
