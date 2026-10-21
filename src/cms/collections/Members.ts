import {
  ValidationError,
  type CollectionAfterChangeHook,
  type CollectionAfterDeleteHook,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type CollectionConfig,
} from 'payload'

import { can, type PermissionSubject } from '../access/permissions'
import { allow } from '../access/roles'
import { describeChange } from '../audit/log'
import { hasFreshStepUp } from '../auth/session-state'
import { refuse, STEP_UP_MESSAGE } from '../lib/errors'
import { groups, label, localizedMessage } from '../lib/labels'
import { deleteCaseEvents, recordCaseEvent } from '../membership/events'
import { notify, recipientsWith } from '../membership/notifications'
import {
  MEMBER_REVIEW,
  memberEndpoints,
  RETENTION_REASONS,
  REVIEW_FIELDS,
  REVIEW_OUTCOMES,
  reviewDueOn,
} from '../membership/review'
import {
  addressGroup,
  DAY_PICKER,
  displayTitle,
  displayTitleField,
  emailField,
  guardianFields,
  membershipTypeField,
  nameRow,
} from './membership-fields'

/** Context flag: the register entry is created from an accepted application (server only). */
export const FROM_APPLICATION = 'fromApplication'

const today = () => new Date().toISOString()

/**
 * Keeps the record consistent: an ended membership has an end date, an active one none; guardian
 * details exist only for people admitted under 18; where the entry came from is set by the
 * server, never by the form or the API.
 */
const normalize: CollectionBeforeChangeHook = async ({
  context,
  data,
  operation,
  originalDoc,
  req,
}) => {
  const status = data.status ?? originalDoc?.status ?? 'active'
  // The review fields change only through the review endpoint.
  if (!context?.[MEMBER_REVIEW]) {
    for (const field of REVIEW_FIELDS) data[field] = originalDoc?.[field] ?? null
  }
  if (operation === 'update' && originalDoc?.status === 'ended' && status === 'active') {
    if (originalDoc.contactDataRemovedOn) {
      throw refuse(
        req,
        label(
          'Die Kontaktdaten dieses Eintrags wurden nach dem Ende der Mitgliedschaft entfernt. Bitte die Person als neues Mitglied erfassen.',
          'The contact data of this entry were removed after the membership ended. Please enter the person as a new member.',
          'أُزيلت بيانات التواصل لهذا الإدخال بعد انتهاء العضوية. يرجى تسجيل الشخص كعضو جديد.',
        ),
        400,
      )
    }
    for (const field of REVIEW_FIELDS) data[field] = null
  }
  if (status === 'ended' && originalDoc?.status !== 'ended' && !context?.[MEMBER_REVIEW]) {
    const settings = (await req.payload.findGlobal({
      slug: 'control-center-settings',
      depth: 0,
      overrideAccess: true,
      req,
    })) as { reminders?: { memberReviewDays?: number | null } }
    const endedOn = String(data.endedOn ?? originalDoc?.endedOn ?? today())
    data.reviewDueOn = reviewDueOn(endedOn, settings.reminders?.memberReviewDays ?? 0)
    data.reviewOutcome = 'pending'
  }
  if (status === 'ended') {
    data.endedOn = data.endedOn ?? originalDoc?.endedOn ?? today()
    const since = new Date(String(data.memberSince ?? originalDoc?.memberSince ?? '')).getTime()
    if (since && new Date(String(data.endedOn)).getTime() < since) {
      throw new ValidationError(
        {
          collection: 'members',
          errors: [
            {
              path: 'endedOn',
              message: localizedMessage(
                label(
                  'Das Ende liegt vor dem Beginn der Mitgliedschaft.',
                  'The end is before the start of the membership.',
                  'تاريخ الانتهاء يسبق بداية العضوية.',
                ),
                req,
              ),
            },
          ],
        },
        req.t,
      )
    }
  } else data.endedOn = null
  const minor = 'minorAtAdmission' in data ? data.minorAtAdmission : originalDoc?.minorAtAdmission
  if (!minor) data.guardian = { name: null, email: null, consentReceivedAt: null }
  if (operation === 'create') {
    const fromApplication = Boolean(context?.[FROM_APPLICATION])
    data.source = fromApplication ? 'application' : 'manual'
    if (!fromApplication) data.application = null
  } else {
    // Where an entry came from is a fact, not an editable value.
    data.source = originalDoc?.source
    data.application = originalDoc?.application
  }
  data.displayTitle = displayTitle({ ...originalDoc, ...data, personalDataMovedOn: null })
  return data
}

/** Deleting a member is a sensitive action: only with a fresh code (and `members.delete`). */
const guardDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  if (req.user && !(await hasFreshStepUp(req))) throw refuse(req, STEP_UP_MESSAGE)
  await deleteCaseEvents(req.payload, { member: Number(id) }, req)
}

const history: CollectionAfterChangeHook = async ({ doc, operation, previousDoc, req }) => {
  const member = Number(doc.id)
  if (operation === 'create') {
    await recordCaseEvent(
      req.payload,
      {
        event: 'member.created',
        member,
        application: typeof doc.application === 'object' ? doc.application?.id : doc.application,
        to: doc.source,
      },
      req,
    )
    return doc
  }
  if (previousDoc?.status !== doc.status) {
    await recordCaseEvent(
      req.payload,
      doc.status === 'ended'
        ? { event: 'member.ended', member, to: doc.endedOn }
        : { event: 'member.reactivated', member },
      req,
    )
  }
  // The review (and what it removes) is recorded as its own entry by the review endpoint.
  if (req.context?.[MEMBER_REVIEW]) return doc
  const changed = (describeChange(doc, previousDoc)?.fields as string[] | undefined)?.filter(
    (field) =>
      !['status', 'endedOn', 'casePanel', 'displayTitle', ...REVIEW_FIELDS].includes(field),
  )
  if (changed?.length) {
    await recordCaseEvent(
      req.payload,
      { event: 'member.updated', member, detail: { fields: changed } },
      req,
    )
  }
  return doc
}

/** Super administrators learn about every deleted register entry (review). */
const reportDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const recipients = (await recipientsWith(req.payload, 'users.manage', req)).filter(
    (id) => id !== Number(req.user?.id),
  )
  await notify(
    req.payload,
    {
      kind: 'memberDeleted',
      recipients,
      subjectType: 'members',
      subjectId: doc.id,
      href: '/admin/collections/audit-log',
    },
    req,
  )
  return doc
}

/**
 * The members register (CC-1): the people the association has admitted, separate from the
 * applications and with its own permissions. An entry is created when an application is
 * accepted, or entered by hand for people who joined before the website existed. It holds the
 * same personal fields as the application and nothing more. Kept while the membership lasts;
 * when it ends, the entry is due for review (src/cms/membership/review.ts). Nothing is deleted
 * automatically.
 */
export const Members: CollectionConfig = {
  slug: 'members',
  labels: {
    singular: label('Mitglied', 'Member', 'عضو'),
    plural: label('Mitglieder', 'Members', 'الأعضاء'),
  },
  admin: {
    useAsTitle: 'displayTitle',
    defaultColumns: ['lastName', 'firstName', 'membershipType', 'status', 'memberSince'],
    group: groups.inbox,
    hidden: ({ user }) => !can(user as PermissionSubject, 'members.read'),
    description: label(
      'Mitgliederverzeichnis. Einträge entstehen bei der Aufnahme eines Antrags oder werden von Hand erfasst. Die Daten bleiben während der Mitgliedschaft; nach dem Ende wird der Eintrag geprüft. Nichts wird automatisch gelöscht.',
      'Members register. Entries are created when an application is accepted, or entered by hand. The data are kept during the membership; when it ends, the entry is reviewed. Nothing is deleted automatically.',
      'سجل الأعضاء. تُنشأ الإدخالات عند قبول طلب أو تُدخل يدويًا. تبقى البيانات طوال العضوية، وبعد انتهائها يُراجَع الإدخال. لا يُحذف شيء تلقائيًا.',
    ),
    components: {
      views: { list: { Component: '/cms/admin/membership/MembersList#MembersList' } },
    },
  },
  defaultSort: 'lastName',
  access: {
    read: allow('members.read'),
    create: allow('members.write'),
    update: allow('members.write'),
    delete: allow('members.delete'),
  },
  endpoints: memberEndpoints,
  hooks: {
    beforeChange: [normalize],
    beforeDelete: [guardDelete],
    afterChange: [history],
    afterDelete: [reportDelete],
  },
  fields: [
    displayTitleField,
    nameRow(),
    emailField('contactDataRemovedOn'),
    addressGroup('contactDataRemovedOn'),
    membershipTypeField,
    {
      name: 'minorAtAdmission',
      type: 'checkbox',
      defaultValue: false,
      label: label('Bei Aufnahme unter 18', 'Under 18 when admitted', 'دون 18 عامًا عند القبول'),
    },
    {
      name: 'guardian',
      type: 'group',
      label: label('Erziehungsberechtigte Person', 'Parent or guardian', 'وليّ الأمر'),
      admin: { condition: (data) => Boolean(data?.minorAtAdmission) },
      fields: guardianFields,
    },
    {
      name: 'casePanel',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '/cms/admin/membership/CasePanel#MemberPanel' },
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      label: label('Status', 'Status', 'الحالة'),
      options: [
        { value: 'active', label: label('Aktiv', 'Active', 'نشط') },
        { value: 'ended', label: label('Beendet', 'Ended', 'منتهية') },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'memberSince',
      type: 'date',
      required: true,
      defaultValue: today,
      label: label('Mitglied seit', 'Member since', 'عضو منذ'),
      admin: { position: 'sidebar', date: DAY_PICKER },
    },
    {
      name: 'endedOn',
      type: 'date',
      label: label('Beendet am', 'Ended on', 'تاريخ الانتهاء'),
      admin: {
        position: 'sidebar',
        condition: (data) => data?.status === 'ended',
        date: DAY_PICKER,
      },
    },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'manual',
      label: label('Erfasst durch', 'Entered by', 'مصدر الإدخال'),
      options: [
        {
          value: 'application',
          label: label('Online-Antrag', 'Online application', 'طلب إلكتروني'),
        },
        { value: 'manual', label: label('Von Hand', 'By hand', 'يدويًا') },
      ],
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'application',
      type: 'relationship',
      relationTo: 'membership-applications',
      label: label('Antrag', 'Application', 'الطلب'),
      admin: {
        position: 'sidebar',
        readOnly: true,
        condition: (data) => Boolean(data?.application),
      },
    },
    // The review after the end of the membership (src/cms/membership/review.ts): shown and
    // decided in the member panel, written only by its endpoint.
    {
      name: 'reviewDueOn',
      type: 'date',
      index: true,
      label: label('Prüfung fällig am', 'Review due on', 'موعد المراجعة'),
      admin: { hidden: true },
    },
    {
      name: 'reviewOutcome',
      type: 'select',
      label: label('Ergebnis der Prüfung', 'Outcome of the review', 'نتيجة المراجعة'),
      options: REVIEW_OUTCOMES.map((value) => ({
        value,
        label: {
          pending: label('Offen', 'Open', 'مفتوحة'),
          retainedAll: label('Vollständig aufbewahrt', 'Kept in full', 'محفوظ بالكامل'),
          retainedMinimal: label(
            'Nur Mindestangaben aufbewahrt',
            'Minimal record kept',
            'الحد الأدنى فقط محفوظ',
          ),
        }[value],
      })),
      admin: { hidden: true },
    },
    {
      name: 'retainUntil',
      type: 'date',
      label: label('Aufbewahren bis', 'Keep until', 'الحفظ حتى'),
      admin: { hidden: true },
    },
    {
      name: 'retentionReason',
      type: 'select',
      label: label('Grund der Aufbewahrung', 'Reason for keeping', 'سبب الحفظ'),
      options: RETENTION_REASONS.map((value) => ({
        value,
        label: {
          legal: label('Gesetzliche Pflicht', 'Legal obligation', 'التزام قانوني'),
          accounting: label('Buchhaltung', 'Accounting', 'المحاسبة'),
          proof: label(
            'Nachweis von Beschlüssen des Vereins',
            'Evidence of the association’s decisions',
            'إثبات قرارات الجمعية',
          ),
          other: label('Anderer Grund', 'Other reason', 'سبب آخر'),
        }[value],
      })),
      admin: { hidden: true },
    },
    { name: 'retentionNote', type: 'text', maxLength: 300, admin: { hidden: true } },
    { name: 'reviewedOn', type: 'date', admin: { hidden: true } },
    { name: 'reviewedByName', type: 'text', admin: { hidden: true } },
    { name: 'contactDataRemovedOn', type: 'date', admin: { hidden: true } },
  ],
}
