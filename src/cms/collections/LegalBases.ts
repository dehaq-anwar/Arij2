import type { Access, CollectionConfig } from 'payload'

import { can, type PermissionSubject } from '../access/permissions'
import { allow, allowed, nobody } from '../access/roles'
import { groups, label } from '../lib/labels'
import { LEGAL_BASIS_CODES, LEGAL_BASES_NOTE } from '../membership/legal-bases'

/** Those who manage, use or review exports read the list; only `settings.manage` edits it. */
export const readForExports: Access = async ({ req }) =>
  (await allowed(req, 'settings.manage')) ||
  (await allowed(req, 'personalData.export')) ||
  (await allowed(req, 'exports.review'))

export const hiddenForExports = ({ user }: { user: unknown }) =>
  !(['settings.manage', 'personalData.export', 'exports.review'] as const).some((permission) =>
    can(user as PermissionSubject, permission),
  )

/**
 * The legal bases of Art. 6(1) GDPR (a–f), with the regulation's wording and a plain
 * explanation in three languages (src/cms/membership/legal-bases.ts; filled by migration). The
 * law fixes the list, so entries are neither added nor deleted; the explanations can be
 * improved, and a basis the association never uses can be switched off for new purposes.
 */
export const LegalBases: CollectionConfig = {
  slug: 'legal-bases',
  labels: {
    singular: label('Rechtsgrundlage', 'Legal basis', 'الأساس القانوني'),
    plural: label('Rechtsgrundlagen', 'Legal bases', 'الأسس القانونية'),
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['code', 'title', 'article', 'available'],
    group: groups.admin,
    hidden: hiddenForExports,
    description: LEGAL_BASES_NOTE,
    pagination: { defaultLimit: 10 },
  },
  defaultSort: 'code',
  access: {
    read: readForExports,
    create: nobody,
    update: allow('settings.manage'),
    delete: nobody,
  },
  fields: [
    {
      name: 'code',
      type: 'select',
      required: true,
      unique: true,
      label: label('Buchstabe', 'Point', 'البند'),
      options: LEGAL_BASIS_CODES.map((code) => ({ value: code, label: `${code})` })),
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      maxLength: 80,
      label: label('Bezeichnung', 'Name', 'التسمية'),
    },
    {
      name: 'article',
      type: 'text',
      required: true,
      localized: true,
      maxLength: 120,
      label: label('Fundstelle', 'Reference', 'المرجع'),
    },
    {
      name: 'wording',
      type: 'textarea',
      required: true,
      localized: true,
      maxLength: 1000,
      label: label('Wortlaut', 'Wording', 'النص'),
      admin: {
        rows: 4,
        description: label(
          'Wortlaut der DSGVO. Vor dem Produktivbetrieb mit dem amtlichen Text abgleichen (eur-lex.europa.eu). Die arabische Fassung ist eine inoffizielle Übersetzung.',
          'Wording of the GDPR. Compare with the official text (eur-lex.europa.eu) before going live. The Arabic version is an unofficial translation.',
          'نص اللائحة العامة لحماية البيانات. يُقارن بالنص الرسمي (eur-lex.europa.eu) قبل التشغيل الفعلي. النسخة العربية ترجمة غير رسمية.',
        ),
      },
    },
    {
      name: 'explanation',
      type: 'textarea',
      required: true,
      localized: true,
      maxLength: 1200,
      label: label('Erläuterung', 'Explanation', 'الشرح'),
      admin: { rows: 5 },
    },
    {
      name: 'available',
      type: 'checkbox',
      defaultValue: true,
      label: label(
        'Für Verarbeitungszwecke wählbar',
        'Can be chosen for processing purposes',
        'متاح للاختيار في أغراض المعالجة',
      ),
      admin: {
        position: 'sidebar',
        description: label(
          'Ausgeschaltet: keine neuen Zwecke mit dieser Grundlage, und Exporte für bestehende Zwecke mit ihr werden abgelehnt.',
          'Switched off: no new purposes on this basis, and exports for existing purposes on it are refused.',
          'عند الإيقاف: لا أغراض جديدة على هذا الأساس، وتُرفض عمليات التصدير للأغراض القائمة عليه.',
        ),
      },
    },
  ],
}
