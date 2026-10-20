import type { Access, CollectionConfig } from 'payload'

import { can, type PermissionSubject } from '../access/permissions'
import { allowed, nobody } from '../access/roles'
import { groups, label } from '../lib/labels'
import { exportEndpoints } from '../membership/export-endpoint'
import { EXPORT_DATASETS } from '../membership/export'

/** Reviewers see every export; everyone who may export sees their own. */
const readExports: Access = async ({ req }) => {
  if (await allowed(req, 'exports.review')) return true
  if (await allowed(req, 'personalData.export')) return { actorId: { equals: req.user!.id } }
  return false
}

/**
 * The export register: who exported which dataset, which columns, how many rows, for which
 * purpose and on which legal basis. It contains no personal data of members or applicants and
 * no file: the CSV is created on request and sent straight to the person. Written only by the
 * export endpoint; the database refuses changes and deletions (like the audit log), and entries
 * are kept as long as the audit log's.
 */
export const Exports: CollectionConfig = {
  slug: 'exports',
  labels: {
    singular: label('Export', 'Export', 'تصدير'),
    plural: label('Exportprotokoll', 'Export register', 'سجل التصدير'),
  },
  admin: {
    useAsTitle: 'purpose',
    defaultColumns: ['createdAt', 'actorName', 'dataset', 'rows', 'legalBasis', 'purpose'],
    group: groups.inbox,
    hidden: ({ user }) =>
      !can(user as PermissionSubject, 'exports.review') &&
      !can(user as PermissionSubject, 'personalData.export'),
    description: label(
      'Jeder Export personenbezogener Daten, mit Zweck und Rechtsgrundlage. Unveränderbar.',
      'Every export of personal data, with its purpose and legal basis. Cannot be changed.',
      'كل عملية تصدير للبيانات الشخصية، مع الغرض والأساس القانوني. غير قابل للتعديل.',
    ),
  },
  defaultSort: '-createdAt',
  lockDocuments: false,
  access: { read: readExports, create: nobody, update: nobody, delete: nobody },
  endpoints: exportEndpoints,
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
    { name: 'rows', type: 'number', required: true, label: label('Zeilen', 'Rows', 'الصفوف') },
    {
      name: 'purpose',
      type: 'text',
      required: true,
      label: label('Zweck', 'Purpose', 'الغرض'),
    },
    {
      name: 'legalBasis',
      type: 'text',
      required: true,
      label: label('Rechtsgrundlage', 'Legal basis', 'الأساس القانوني'),
    },
    { name: 'columns', type: 'json', label: label('Spalten', 'Columns', 'الأعمدة') },
    { name: 'filter', type: 'json', label: label('Auswahl', 'Selection', 'معايير الاختيار') },
    { name: 'actorId', type: 'number', index: true, admin: { hidden: true } },
    { name: 'actorName', type: 'text', label: label('Person', 'Person', 'الشخص') },
    { name: 'actorRole', type: 'text', label: label('Rolle', 'Role', 'الدور') },
  ],
}
