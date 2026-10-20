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
  addressGroup,
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
const normalize: CollectionBeforeChangeHook = ({ context, data, operation, originalDoc, req }) => {
  const status = data.status ?? originalDoc?.status ?? 'active'
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
  const changed = (describeChange(doc, previousDoc)?.fields as string[] | undefined)?.filter(
    (field) => !['status', 'endedOn', 'casePanel'].includes(field),
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
 * same personal fields as the application and nothing more. No automatic deletion: how long
 * entries are kept after a membership ends is the association's decision (decision 12).
 */
export const Members: CollectionConfig = {
  slug: 'members',
  labels: {
    singular: label('Mitglied', 'Member', 'عضو'),
    plural: label('Mitglieder', 'Members', 'الأعضاء'),
  },
  admin: {
    useAsTitle: 'lastName',
    defaultColumns: ['lastName', 'firstName', 'membershipType', 'status', 'memberSince'],
    group: groups.inbox,
    hidden: ({ user }) => !can(user as PermissionSubject, 'members.read'),
    description: label(
      'Mitgliederverzeichnis. Einträge entstehen bei der Aufnahme eines Antrags oder werden von Hand erfasst. Es gibt keine automatische Löschung (Entscheidung 12 des Vereins steht aus).',
      'Members register. Entries are created when an application is accepted, or entered by hand. There is no automatic deletion (the association’s decision 12 is pending).',
      'سجل الأعضاء. تُنشأ الإدخالات عند قبول طلب أو تُدخل يدويًا. لا يوجد حذف تلقائي (قرار الجمعية رقم 12 قيد الانتظار).',
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
  hooks: {
    beforeChange: [normalize],
    beforeDelete: [guardDelete],
    afterChange: [history],
    afterDelete: [reportDelete],
  },
  fields: [
    nameRow,
    emailField,
    addressGroup,
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
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'endedOn',
      type: 'date',
      label: label('Beendet am', 'Ended on', 'تاريخ الانتهاء'),
      admin: {
        position: 'sidebar',
        condition: (data) => data?.status === 'ended',
        date: { pickerAppearance: 'dayOnly' },
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
  ],
}
