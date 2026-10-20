import {
  ValidationError,
  type CollectionAfterChangeHook,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type CollectionConfig,
} from 'payload'

import { allow, nobody } from '../access/roles'
import { refuse } from '../lib/errors'
import { groups, label, localizedMessage } from '../lib/labels'
import { deleteCaseEvents, recordCaseEvent } from '../membership/events'
import { adminHref, notify } from '../membership/notifications'
import { consentRecord, hiddenWithoutInbox, submitted, submittedLocale } from './inbox'
import { FROM_APPLICATION } from './Members'
import {
  addressGroup,
  emailField,
  guardianFields,
  MEMBERSHIP_ROLES,
  membershipTypeField,
  nameRow,
} from './membership-fields'

type Guardian = { consentReceivedAt?: string | null } | null | undefined

const relationId = (value: unknown) =>
  value && typeof value === 'object'
    ? Number((value as { id: number }).id)
    : value == null
      ? null
      : Number(value)

/**
 * Once the register entry exists, the decision is final here: changes to the membership are made
 * in the members register (ending a membership there, not by "un-accepting" the application).
 */
const lockAfterAdmission: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (operation !== 'update' || originalDoc?.status !== 'accepted') return data
  if (!data.status || data.status === 'accepted') return data
  const { totalDocs } = await req.payload.count({
    collection: 'members',
    where: { application: { equals: originalDoc.id } },
    overrideAccess: true,
    req,
  })
  if (totalDocs > 0) {
    throw refuse(
      req,
      label(
        'Diese Person ist bereits im Mitgliederverzeichnis eingetragen. Änderungen der Mitgliedschaft bitte dort vornehmen.',
        'This person is already in the members register. Please make changes to the membership there.',
        'هذا الشخص مسجّل بالفعل في سجل الأعضاء. يرجى إجراء تغييرات العضوية هناك.',
      ),
      400,
    )
  }
  return data
}

/**
 * A decision (accepted or rejected) records who made it and when; any open stage clears both.
 * Applicants under 18 can only be accepted once the guardian's consent is recorded (the rule
 * from Phase 5, unchanged; a collection hook so that partial API updates are covered too).
 */
const recordDecision: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  if (operation !== 'update' || !data.status || data.status === originalDoc?.status) return data
  if (data.status === 'received' || data.status === 'inReview') {
    return { ...data, decisionDate: null, decidedBy: null }
  }
  const under18 = 'under18' in data ? data.under18 : originalDoc?.under18
  const consent = (
    'guardian' in data ? (data.guardian as Guardian) : (originalDoc?.guardian as Guardian)
  )?.consentReceivedAt
  if (data.status === 'accepted' && under18 && !consent) {
    throw new ValidationError(
      {
        collection: 'membership-applications',
        errors: [
          {
            path: 'guardian.consentReceivedAt',
            message: localizedMessage(
              label(
                'Vor der Aufnahme bitte das Datum der Zustimmung eintragen.',
                'Enter the date of consent before accepting the application.',
                'أدخل تاريخ الموافقة قبل قبول الطلب.',
              ),
              req,
            ),
          },
        ],
      },
      req.t,
    )
  }
  return {
    ...data,
    decisionDate: data.decisionDate ?? new Date().toISOString(),
    decidedBy: req.user?.id ?? null,
  }
}

/**
 * Case history, the register entry on acceptance, and a notification for whoever the application
 * is assigned to. Runs in the change's transaction: if creating the register entry fails, the
 * acceptance is rolled back too.
 */
const afterApplicationChange: CollectionAfterChangeHook = async ({
  doc,
  operation,
  previousDoc,
  req,
}) => {
  const application = Number(doc.id)
  if (operation === 'create') {
    await recordCaseEvent(req.payload, { event: 'application.received', application }, req)
    return doc
  }
  if (previousDoc?.status !== doc.status) {
    await recordCaseEvent(
      req.payload,
      { event: 'application.status', application, from: previousDoc?.status, to: doc.status },
      req,
    )
  }
  if (!previousDoc?.guardian?.consentReceivedAt && doc.guardian?.consentReceivedAt) {
    await recordCaseEvent(
      req.payload,
      { event: 'application.consent', application, to: doc.guardian.consentReceivedAt },
      req,
    )
  }
  const assignee = relationId(doc.assignedTo)
  if (assignee !== relationId(previousDoc?.assignedTo)) {
    const person = assignee
      ? await req.payload.findByID({
          collection: 'users',
          id: assignee,
          depth: 0,
          overrideAccess: true,
          select: { name: true },
          req,
        })
      : null
    await recordCaseEvent(
      req.payload,
      { event: 'application.assigned', application, to: person?.name ?? null },
      req,
    )
    if (assignee && assignee !== Number(req.user?.id)) {
      await notify(
        req.payload,
        {
          kind: 'assigned',
          recipients: [assignee],
          subjectType: 'membership-applications',
          subjectId: application,
          href: adminHref('membership-applications', application),
        },
        req,
      )
    }
  }
  if ((previousDoc?.followUpOn ?? null) !== (doc.followUpOn ?? null)) {
    await recordCaseEvent(
      req.payload,
      { event: 'application.followUp', application, to: doc.followUpOn ?? null },
      req,
    )
  }
  if (doc.status === 'accepted' && previousDoc?.status !== 'accepted') {
    const { totalDocs } = await req.payload.count({
      collection: 'members',
      where: { application: { equals: application } },
      overrideAccess: true,
      req,
    })
    if (totalDocs === 0) {
      await req.payload.create({
        collection: 'members',
        data: {
          firstName: doc.firstName,
          lastName: doc.lastName,
          email: doc.email,
          address: doc.address,
          membershipType: doc.membershipType,
          memberSince: doc.decisionDate ?? new Date().toISOString(),
          status: 'active',
          minorAtAdmission: Boolean(doc.under18),
          guardian: doc.under18 ? doc.guardian : undefined,
          application,
        },
        context: { [FROM_APPLICATION]: true },
        overrideAccess: true,
        depth: 0,
        req,
      })
    }
  }
  return doc
}

/** The case history belongs to the application and goes with it. */
const removeHistory: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await deleteCaseEvents(req.payload, { application: Number(id) }, req)
}

/**
 * Online membership applications (Satzung § 3). Only the fields the Satzung needs are collected:
 * no date of birth, phone, gender, nationality, religion or bank details. Created by the website
 * form on the server; never readable through the public API.
 */
export const MembershipApplications: CollectionConfig = {
  slug: 'membership-applications',
  labels: {
    singular: label('Mitgliedsantrag', 'Membership application', 'طلب عضوية'),
    plural: label('Mitgliedsanträge', 'Membership applications', 'طلبات العضوية'),
  },
  admin: {
    useAsTitle: 'lastName',
    defaultColumns: ['lastName', 'firstName', 'membershipType', 'status', 'createdAt'],
    group: groups.inbox,
    hidden: hiddenWithoutInbox,
    components: {
      views: { list: { Component: '/cms/admin/membership/ApplicationsList#ApplicationsList' } },
    },
    description: label(
      'Rückmeldung an die Antragstellenden per E-Mail. Abgelehnte Anträge werden sechs Monate nach der Entscheidung automatisch gelöscht.',
      'Reply to applicants by e-mail. Rejected applications are deleted automatically six months after the decision.',
      'يُرد على مقدمي الطلبات بالبريد الإلكتروني. تُحذف الطلبات المرفوضة تلقائيًا بعد ستة أشهر من القرار.',
    ),
  },
  defaultSort: '-createdAt',
  access: {
    create: nobody,
    read: allow('inbox.read'),
    update: allow('inbox.write'),
    delete: allow('applications.delete'),
  },
  hooks: {
    beforeChange: [lockAfterAdmission, recordDecision],
    afterChange: [afterApplicationChange],
    beforeDelete: [removeHistory],
  },
  fields: [
    nameRow,
    emailField,
    addressGroup,
    membershipTypeField,
    {
      name: 'declarations',
      type: 'group',
      label: label('Erklärungen', 'Declarations', 'الإقرارات'),
      admin: submitted,
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'atLeast16',
              type: 'checkbox',
              required: true,
              label: label(
                'Mindestens 16 Jahre',
                'At least 16 years old',
                'عمره 16 عامًا على الأقل',
              ),
            },
            {
              name: 'principles',
              type: 'checkbox',
              required: true,
              label: label(
                'Grundsätze und Ziele (§§ 2–3)',
                'Principles and aims (§§ 2–3)',
                'المبادئ والأهداف (§§ 2–3)',
              ),
            },
            {
              name: 'fees',
              type: 'checkbox',
              required: true,
              label: label(
                'Beiträge zur Kenntnis genommen (§ 4)',
                'Fees acknowledged (§ 4)',
                'الاطلاع على الاشتراكات (§ 4)',
              ),
            },
          ],
        },
      ],
    },
    {
      name: 'under18',
      type: 'checkbox',
      defaultValue: false,
      label: label('Unter 18 Jahren', 'Under 18', 'دون 18 عامًا'),
      admin: submitted,
    },
    {
      name: 'guardian',
      type: 'group',
      label: label('Erziehungsberechtigte Person', 'Parent or guardian', 'وليّ الأمر'),
      admin: {
        condition: (data) => Boolean(data?.under18),
        description: label(
          'Der Verein holt die Zustimmung bei dieser Person ein (z. B. schriftlich). Welche Form genügt, entscheidet der Vorstand.',
          'The association obtains consent from this person (e.g. in writing). The board decides which form is sufficient.',
          'تحصل الجمعية على الموافقة من هذا الشخص (كتابيًا مثلًا). ويقرر مجلس الإدارة أي صيغة تكفي.',
        ),
      },
      fields: guardianFields,
    },
    consentRecord,
    submittedLocale,
    {
      name: 'casePanel',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '/cms/admin/membership/CasePanel#ApplicationPanel' },
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'received',
      label: label('Status', 'Status', 'الحالة'),
      options: [
        { value: 'received', label: label('Eingegangen', 'Received', 'وارد') },
        { value: 'inReview', label: label('In Prüfung', 'In review', 'قيد المراجعة') },
        { value: 'accepted', label: label('Aufgenommen', 'Accepted', 'مقبول') },
        { value: 'rejected', label: label('Abgelehnt', 'Rejected', 'مرفوض') },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'decisionDate',
      type: 'date',
      label: label('Entschieden am', 'Decided on', 'تاريخ القرار'),
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'decidedBy',
      type: 'relationship',
      relationTo: 'users',
      label: label('Entschieden von', 'Decided by', 'صاحب القرار'),
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      label: label('Zuständig', 'Assigned to', 'المسؤول'),
      filterOptions: {
        and: [{ role: { in: [...MEMBERSHIP_ROLES] } }, { disabled: { not_equals: true } }],
      },
      admin: { position: 'sidebar' },
    },
    {
      name: 'followUpOn',
      type: 'date',
      label: label('Wiedervorlage am', 'Follow up on', 'موعد المتابعة'),
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly' },
        description: label(
          'An diesem Tag erinnert das Control Center die zuständige Person.',
          'On this day the Control Center reminds the person assigned.',
          'في هذا اليوم يذكّر مركز التحكم الشخص المسؤول.',
        ),
      },
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      maxLength: 2000,
      label: label('Interne Notizen', 'Internal notes', 'ملاحظات داخلية'),
      admin: {
        position: 'sidebar',
        description: label(
          'Nur das Nötige notieren.',
          'Write down only what is necessary.',
          'دوّن الضروري فقط.',
        ),
      },
    },
  ],
}
