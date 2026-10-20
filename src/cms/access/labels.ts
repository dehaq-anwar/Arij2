import { label, type AdminLabel } from '../lib/labels'
import type { Permission, Role } from './permissions'

export const roleLabels: Record<Role, AdminLabel> = {
  superAdmin: label('Super-Administration', 'Super administrator', 'المسؤول العام'),
  boardAdmin: label('Vorstand (Administration)', 'Board administrator', 'مسؤول مجلس الإدارة'),
  contentEditor: label('Redaktion', 'Content editor', 'محرر المحتوى'),
  membershipManager: label('Mitgliederverwaltung', 'Membership manager', 'مدير العضوية'),
  technicalAdmin: label('Technik', 'Technical administrator', 'المسؤول التقني'),
  auditor: label('Prüfung (nur lesen)', 'Read-only auditor', 'المدقق (قراءة فقط)'),
}

export const permissionLabels: Record<Permission, AdminLabel> = {
  'content.read': label(
    'Inhalte ansehen (auch Entwürfe)',
    'View content (drafts too)',
    'عرض المحتوى (والمسودات)',
  ),
  'content.write': label(
    'Inhalte bearbeiten und veröffentlichen',
    'Edit and publish content',
    'تحرير المحتوى ونشره',
  ),
  'inbox.read': label(
    'Anträge und Nachrichten ansehen',
    'View applications and messages',
    'عرض الطلبات والرسائل',
  ),
  'inbox.write': label(
    'Anträge und Nachrichten bearbeiten',
    'Process applications and messages',
    'معالجة الطلبات والرسائل',
  ),
  'applications.delete': label('Anträge löschen', 'Delete applications', 'حذف الطلبات'),
  'messages.delete': label('Nachrichten löschen', 'Delete messages', 'حذف الرسائل'),
  'members.read': label('Mitglieder ansehen', 'View members', 'عرض الأعضاء'),
  'members.write': label('Mitglieder bearbeiten', 'Edit members', 'تحرير بيانات الأعضاء'),
  'members.delete': label('Mitglieder löschen', 'Delete members', 'حذف الأعضاء'),
  'personalData.export': label(
    'Personenbezogene Daten exportieren',
    'Export personal data',
    'تصدير البيانات الشخصية',
  ),
  'exports.review': label(
    'Exportprotokoll prüfen',
    'Review the export register',
    'مراجعة سجل التصدير',
  ),
  'settings.manage': label(
    'Einstellungen des Control Centers',
    'Control Center settings',
    'إعدادات مركز التحكم',
  ),
  'operations.read': label('Betrieb ansehen', 'View operations', 'عرض التشغيل'),
  'operations.act': label(
    'Betriebsaktionen ausführen',
    'Run operations actions',
    'تنفيذ إجراءات التشغيل',
  ),
  'email.manage': label('E-Mail-Einstellungen', 'E-mail settings', 'إعدادات البريد'),
  'jobs.run': label('Aufgaben manuell starten', 'Run jobs manually', 'تشغيل المهام يدويًا'),
  'users.read': label('Konten ansehen', 'View accounts', 'عرض الحسابات'),
  'users.manage': label('Konten verwalten', 'Manage accounts', 'إدارة الحسابات'),
  'users.manageLimited': label(
    'Redaktion und Mitgliederverwaltung verwalten',
    'Manage editors and membership managers',
    'إدارة المحررين ومديري العضوية',
  ),
  'audit.read': label('Audit-Log ansehen', 'View audit log', 'عرض سجل العمليات'),
}
