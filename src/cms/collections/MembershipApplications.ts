import { ValidationError, type CollectionBeforeChangeHook, type CollectionConfig } from 'payload'

import { allow, nobody } from '../access/roles'
import { groups, label, localizedMessage } from '../lib/labels'
import { consentRecord, hiddenWithoutInbox, submitted, submittedLocale } from './inbox'

type Guardian = { consentReceivedAt?: string | null } | null | undefined

/**
 * A decision records who made it and when; back to "received" clears both. Applicants under 18
 * can only be accepted once the guardian's consent is recorded (also for partial API updates,
 * hence a collection hook rather than a field rule).
 */
const recordDecision: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  if (operation !== 'update' || !data.status || data.status === originalDoc?.status) return data
  if (data.status === 'received') return { ...data, decisionDate: null, decidedBy: null }
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
  hooks: { beforeChange: [recordDecision] },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'firstName',
          type: 'text',
          required: true,
          maxLength: 100,
          label: label('Vorname', 'First name', 'الاسم الأول'),
        },
        {
          name: 'lastName',
          type: 'text',
          required: true,
          maxLength: 100,
          label: label('Nachname', 'Last name', 'اسم العائلة'),
        },
      ],
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      label: label('E-Mail', 'E-mail', 'البريد الإلكتروني'),
    },
    {
      name: 'address',
      type: 'group',
      label: label('Anschrift', 'Address', 'العنوان'),
      admin: {
        description: label(
          'Für schriftliche Einladungen zur Mitgliederversammlung (Satzung § 7).',
          'For written invitations to the general meeting (Satzung § 7).',
          'لإرسال الدعوات المكتوبة إلى الجمعية العمومية (النظام الأساسي § 7).',
        ),
      },
      fields: [
        {
          name: 'street',
          type: 'text',
          required: true,
          maxLength: 150,
          label: label('Straße und Hausnummer', 'Street and number', 'الشارع ورقم المنزل'),
        },
        {
          type: 'row',
          fields: [
            {
              name: 'postalCode',
              type: 'text',
              required: true,
              maxLength: 12,
              label: label('PLZ', 'Postcode', 'الرمز البريدي'),
            },
            {
              name: 'city',
              type: 'text',
              required: true,
              maxLength: 100,
              label: label('Ort', 'City', 'المدينة'),
            },
            {
              name: 'country',
              type: 'text',
              required: true,
              maxLength: 100,
              label: label('Land', 'Country', 'البلد'),
            },
          ],
        },
      ],
    },
    {
      name: 'membershipType',
      type: 'select',
      required: true,
      label: label('Art der Mitgliedschaft', 'Type of membership', 'نوع العضوية'),
      options: [
        { value: 'ordinary', label: label('Ordentlich', 'Ordinary', 'عادية') },
        { value: 'supporting', label: label('Fördernd', 'Supporting', 'داعمة') },
      ],
    },
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
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'name',
              type: 'text',
              maxLength: 200,
              label: label('Name', 'Name', 'الاسم'),
            },
            {
              name: 'email',
              type: 'email',
              label: label('E-Mail', 'E-mail', 'البريد الإلكتروني'),
            },
          ],
        },
        {
          name: 'consentReceivedAt',
          type: 'date',
          label: label('Zustimmung liegt vor seit', 'Consent received on', 'تاريخ استلام الموافقة'),
        },
      ],
    },
    consentRecord,
    submittedLocale,
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'received',
      label: label('Status', 'Status', 'الحالة'),
      options: [
        { value: 'received', label: label('Eingegangen', 'Received', 'وارد') },
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
