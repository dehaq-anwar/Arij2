import type { Access, CollectionConfig } from 'payload'

import { AUDIT_AREAS, auditAreasOf, can, type PermissionSubject } from '../access/permissions'
import { nobody } from '../access/roles'
import { isVerifiedSession } from '../auth/session-state'
import { groups, label } from '../lib/labels'

/**
 * Who may read which entries: super administrators and auditors everything, board
 * administrators users/content/association, technical administrators operations.
 */
const readAudit: Access = async ({ req }) => {
  const areas = auditAreasOf(req.user as PermissionSubject)
  if (areas.length === 0 || !(await isVerifiedSession(req))) return false
  if (areas.length === AUDIT_AREAS.length) return true
  return { area: { in: [...areas] } }
}

/**
 * Append-only record of administrative and security events (docs/CONTROL-CENTER.md §3.4).
 * Nobody can create, change or delete entries through the API or the admin; server code writes
 * them (src/cms/audit/log.ts), and a database trigger refuses UPDATE and DELETE on the table.
 * Entries hold ids, names of accounts and what happened, never the content of forms or messages.
 */
export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  labels: {
    singular: label('Protokolleintrag', 'Audit entry', 'إدخال في السجل'),
    plural: label('Audit-Log', 'Audit log', 'سجل العمليات'),
  },
  admin: {
    group: groups.security,
    useAsTitle: 'action',
    defaultColumns: ['createdAt', 'action', 'actorName', 'targetLabel', 'area', 'result'],
    hidden: ({ user }) => !can(user as PermissionSubject, 'audit.read'),
    description: label(
      'Unveränderbar: Einträge können weder bearbeitet noch gelöscht werden.',
      'Append-only: entries cannot be edited or deleted.',
      'غير قابل للتعديل: لا يمكن تحرير الإدخالات أو حذفها.',
    ),
  },
  defaultSort: '-createdAt',
  access: { create: nobody, read: readAudit, update: nobody, delete: nobody },
  lockDocuments: false,
  fields: [
    {
      name: 'action',
      type: 'text',
      required: true,
      index: true,
      label: label('Aktion', 'Action', 'الإجراء'),
      admin: { components: { Cell: '/cms/admin/audit/ActionCell#ActionCell' } },
    },
    {
      name: 'area',
      type: 'select',
      required: true,
      index: true,
      label: label('Bereich', 'Area', 'المجال'),
      options: [
        {
          value: 'security',
          label: label('Anmeldung & Sicherheit', 'Sign-in & security', 'الدخول والأمان'),
        },
        {
          value: 'users',
          label: label('Benutzer & Rollen', 'Users & roles', 'المستخدمون والأدوار'),
        },
        { value: 'content', label: label('Inhalte', 'Content', 'المحتوى') },
        { value: 'association', label: label('Verein', 'Association', 'الجمعية') },
        { value: 'operations', label: label('Betrieb', 'Operations', 'التشغيل') },
      ],
    },
    {
      name: 'result',
      type: 'select',
      required: true,
      defaultValue: 'ok',
      label: label('Ergebnis', 'Result', 'النتيجة'),
      options: [
        { value: 'ok', label: label('Erfolgreich', 'Succeeded', 'نجح') },
        { value: 'denied', label: label('Abgelehnt', 'Denied', 'مرفوض') },
        { value: 'failed', label: label('Fehlgeschlagen', 'Failed', 'فشل') },
      ],
    },
    {
      type: 'row',
      fields: [
        // A plain id instead of a relationship: deleting an account must not change its entries.
        {
          name: 'actorId',
          type: 'number',
          index: true,
          label: label('Konto-ID', 'Account id', 'معرّف الحساب'),
        },
        {
          name: 'actorName',
          type: 'text',
          label: label('Person', 'Person', 'الشخص'),
          admin: { components: { Cell: '/cms/admin/users/cells#ActorCell' } },
        },
        { name: 'actorRole', type: 'text', label: label('Rolle', 'Role', 'الدور') },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'targetType', type: 'text', label: label('Objekt', 'Object', 'العنصر') },
        { name: 'targetId', type: 'text', label: label('Objekt-ID', 'Object id', 'معرّف العنصر') },
        {
          name: 'targetLabel',
          type: 'text',
          label: label('Bezeichnung', 'Name', 'الاسم'),
          admin: { components: { Cell: '/cms/admin/users/cells#TargetCell' } },
        },
      ],
    },
    {
      name: 'stepUp',
      type: 'checkbox',
      label: label('Mit Code bestätigt', 'Confirmed with code', 'مؤكد بالرمز'),
    },
    { name: 'detail', type: 'json', label: label('Details', 'Details', 'التفاصيل') },
  ],
}
