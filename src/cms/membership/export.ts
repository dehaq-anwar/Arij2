import type { AdminLabel } from '../lib/labels'
import { label } from '../lib/labels'

/**
 * What can be exported. Only these columns exist; internal notes, the consent wording and the
 * case history are never part of an export. The person exporting picks the columns they need
 * (data minimisation) and states a purpose and a legal basis.
 */
export const EXPORT_DATASETS = ['applications', 'members'] as const
export type ExportDataset = (typeof EXPORT_DATASETS)[number]

type Row = Record<string, unknown>
type Language = 'de' | 'en' | 'ar'

const isoDate = (value: unknown) => {
  if (typeof value !== 'string' || !value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  // The calendar day in the association's time zone, as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(date)
}
const group = (row: Row, name: string) => (row[name] ?? {}) as Row

const yesNo: Record<Language, [string, string]> = {
  de: ['ja', 'nein'],
  en: ['yes', 'no'],
  ar: ['نعم', 'لا'],
}

export const VALUE_LABELS: Record<string, AdminLabel> = {
  ordinary: label('Ordentlich', 'Ordinary', 'عادية'),
  supporting: label('Fördernd', 'Supporting', 'داعمة'),
  received: label('Eingegangen', 'Received', 'وارد'),
  inReview: label('In Prüfung', 'In review', 'قيد المراجعة'),
  accepted: label('Aufgenommen', 'Accepted', 'مقبول'),
  rejected: label('Abgelehnt', 'Rejected', 'مرفوض'),
  active: label('Aktiv', 'Active', 'نشط'),
  ended: label('Beendet', 'Ended', 'منتهية'),
}

export type ExportColumn = {
  key: string
  label: AdminLabel
  value: (row: Row, language: Language) => string
}

const text = (pick: (row: Row) => unknown) => (row: Row) => {
  const value = pick(row)
  return typeof value === 'string' ? value : ''
}
const translated = (pick: (row: Row) => unknown) => (row: Row, language: Language) => {
  const value = pick(row)
  return typeof value === 'string' ? (VALUE_LABELS[value]?.[language] ?? value) : ''
}
const flag = (pick: (row: Row) => unknown) => (row: Row, language: Language) =>
  yesNo[language][pick(row) ? 0 : 1]

const person: ExportColumn[] = [
  {
    key: 'firstName',
    label: label('Vorname', 'First name', 'الاسم الأول'),
    value: text((r) => r.firstName),
  },
  {
    key: 'lastName',
    label: label('Nachname', 'Last name', 'اسم العائلة'),
    value: text((r) => r.lastName),
  },
  {
    key: 'email',
    label: label('E-Mail', 'E-mail', 'البريد الإلكتروني'),
    value: text((r) => r.email),
  },
  {
    key: 'street',
    label: label('Straße und Hausnummer', 'Street and number', 'الشارع ورقم المنزل'),
    value: text((r) => group(r, 'address').street),
  },
  {
    key: 'postalCode',
    label: label('PLZ', 'Postcode', 'الرمز البريدي'),
    value: text((r) => group(r, 'address').postalCode),
  },
  {
    key: 'city',
    label: label('Ort', 'City', 'المدينة'),
    value: text((r) => group(r, 'address').city),
  },
  {
    key: 'country',
    label: label('Land', 'Country', 'البلد'),
    value: text((r) => group(r, 'address').country),
  },
  {
    key: 'membershipType',
    label: label('Art der Mitgliedschaft', 'Type of membership', 'نوع العضوية'),
    value: translated((r) => r.membershipType),
  },
]

const guardian = (consentLabel: AdminLabel): ExportColumn[] => [
  {
    key: 'guardianName',
    label: label('Erziehungsberechtigte Person', 'Parent or guardian', 'وليّ الأمر'),
    value: text((r) => group(r, 'guardian').name),
  },
  {
    key: 'guardianEmail',
    label: label(
      'E-Mail der erziehungsberechtigten Person',
      'E-mail of the parent or guardian',
      'البريد الإلكتروني لوليّ الأمر',
    ),
    value: text((r) => group(r, 'guardian').email),
  },
  {
    key: 'guardianConsent',
    label: consentLabel,
    value: (r) => isoDate(group(r, 'guardian').consentReceivedAt),
  },
]

export const EXPORT_COLUMNS: Record<ExportDataset, ExportColumn[]> = {
  applications: [
    ...person,
    {
      key: 'status',
      label: label('Status', 'Status', 'الحالة'),
      value: translated((r) => r.status),
    },
    {
      key: 'receivedOn',
      label: label('Eingegangen am', 'Received on', 'تاريخ الورود'),
      value: (r) => isoDate(r.createdAt),
    },
    {
      key: 'decisionDate',
      label: label('Entschieden am', 'Decided on', 'تاريخ القرار'),
      value: (r) => isoDate(r.decisionDate),
    },
    {
      key: 'under18',
      label: label('Unter 18 Jahren', 'Under 18', 'دون 18 عامًا'),
      value: flag((r) => r.under18),
    },
    ...guardian(label('Zustimmung liegt vor seit', 'Consent received on', 'تاريخ استلام الموافقة')),
  ],
  members: [
    ...person,
    {
      key: 'status',
      label: label('Status', 'Status', 'الحالة'),
      value: translated((r) => r.status),
    },
    {
      key: 'memberSince',
      label: label('Mitglied seit', 'Member since', 'عضو منذ'),
      value: (r) => isoDate(r.memberSince),
    },
    {
      key: 'endedOn',
      label: label('Beendet am', 'Ended on', 'تاريخ الانتهاء'),
      value: (r) => isoDate(r.endedOn),
    },
    {
      key: 'minorAtAdmission',
      label: label('Bei Aufnahme unter 18', 'Under 18 when admitted', 'دون 18 عامًا عند القبول'),
      value: flag((r) => r.minorAtAdmission),
    },
    ...guardian(label('Zustimmung liegt vor seit', 'Consent received on', 'تاريخ استلام الموافقة')),
  ],
}

export const isExportDataset = (value: unknown): value is ExportDataset =>
  (EXPORT_DATASETS as readonly string[]).includes(value as string)

/** The requested columns that exist, in the dataset's order; unknown keys are dropped. */
export function pickColumns(dataset: ExportDataset, keys: unknown): ExportColumn[] {
  const wanted = new Set(Array.isArray(keys) ? keys.filter((k) => typeof k === 'string') : [])
  return EXPORT_COLUMNS[dataset].filter((column) => wanted.has(column.key))
}

export function exportTable(
  dataset: ExportDataset,
  columns: ExportColumn[],
  rows: Row[],
  language: Language,
) {
  return {
    header: columns.map((column) => column.label[language]),
    rows: rows.map((row) => columns.map((column) => column.value(row, language))),
    dataset,
  }
}

/** The purpose is stored in the export register: required, short, and without line breaks. */
export function cleanPurpose(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const purpose = value.replace(/\s+/g, ' ').trim()
  return purpose.length >= 10 && purpose.length <= 300 ? purpose : null
}
