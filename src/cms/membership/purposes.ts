import type { AdminLabel } from '../lib/labels'
import { EXPORT_COLUMNS, EXPORT_DATASETS, type ExportColumn, type ExportDataset } from './export'
import type { LegalBasisCode } from './legal-bases'

/**
 * Processing purposes (Verarbeitungszwecke): what personal data may be exported for. The
 * association describes each purpose, picks its legal basis from Art. 6(1) GDPR, justifies why
 * that basis fits and limits the columns to what the purpose needs. Only approved purposes can
 * be used for an export, and the export can only contain the purpose's columns.
 */
export const PURPOSE_STATUSES = ['draft', 'approved', 'retired'] as const
export type PurposeStatus = (typeof PURPOSE_STATUSES)[number]

/** Changing one of these takes an approved purpose back to "draft": it must be approved again. */
export const SUBSTANTIVE_FIELDS = ['dataset', 'legalBasis', 'justification', 'columns'] as const

export type LegalBasisLike = {
  id?: number
  code?: LegalBasisCode | string | null
  available?: boolean | null
}

export type PurposeLike = {
  id?: number
  dataset?: string | null
  legalBasis?: number | LegalBasisLike | null
  justification?: string | null
  columns?: string[] | null
  status?: string | null
}

/** Every column key of every dataset once, for the purpose's column select. */
export function columnOptions(): { value: string; label: AdminLabel }[] {
  const seen = new Map<string, AdminLabel>()
  for (const dataset of EXPORT_DATASETS) {
    for (const column of EXPORT_COLUMNS[dataset]) {
      if (!seen.has(column.key)) seen.set(column.key, column.label)
    }
  }
  return [...seen].map(([value, label]) => ({ value, label }))
}

const isDataset = (value: unknown): value is ExportDataset =>
  (EXPORT_DATASETS as readonly string[]).includes(value as string)

/** Column keys of the purpose that exist in its dataset. */
export function purposeColumnKeys(purpose: PurposeLike): string[] {
  if (!isDataset(purpose.dataset)) return []
  const wanted = new Set(purpose.columns ?? [])
  return EXPORT_COLUMNS[purpose.dataset].filter((c) => wanted.has(c.key)).map((c) => c.key)
}

/** Column keys of the purpose that do not exist in its dataset (a mistake to point out). */
export function foreignColumns(dataset: unknown, columns: unknown): string[] {
  if (!isDataset(dataset) || !Array.isArray(columns)) return []
  const known = new Set(EXPORT_COLUMNS[dataset].map((c) => c.key))
  return columns.filter((key): key is string => typeof key === 'string' && !known.has(key))
}

export type ApprovalProblem = 'dataset' | 'legalBasis' | 'justification' | 'columns' | 'decision'

/** What is missing before the purpose can be approved (empty when it can). */
export function approvalProblems(
  purpose: PurposeLike,
  basis: LegalBasisLike | null,
  decisionReference: unknown,
): ApprovalProblem[] {
  const problems: ApprovalProblem[] = []
  if (!isDataset(purpose.dataset)) problems.push('dataset')
  if (!basis || basis.available === false) problems.push('legalBasis')
  if (typeof purpose.justification !== 'string' || purpose.justification.trim().length < 20) {
    problems.push('justification')
  }
  if (
    !purposeColumnKeys(purpose).length ||
    foreignColumns(purpose.dataset, purpose.columns).length
  ) {
    problems.push('columns')
  }
  if (typeof decisionReference !== 'string' || decisionReference.trim().length < 5) {
    problems.push('decision')
  }
  return problems
}

/** True if the change touches what the approval was given for. */
export function changesSubstance(previous: PurposeLike, next: PurposeLike): boolean {
  const id = (value: PurposeLike['legalBasis']) =>
    value && typeof value === 'object' ? value.id : value
  if (previous.dataset !== next.dataset) return true
  if (id(previous.legalBasis) !== id(next.legalBasis)) return true
  if ((previous.justification ?? '').trim() !== (next.justification ?? '').trim()) return true
  const a = [...(previous.columns ?? [])].sort().join(',')
  const b = [...(next.columns ?? [])].sort().join(',')
  return a !== b
}

export type ExportCheck =
  | { ok: true; columns: ExportColumn[] }
  | { ok: false; error: 'purpose_not_approved' | 'legal_basis' | 'columns' }

/**
 * Whether an export of `dataset` with the requested columns is covered by the purpose: it must
 * be approved, for this dataset, on an available legal basis, and the columns must be the
 * purpose's (in the dataset's order; at least one).
 */
export function checkExport(
  purpose: PurposeLike | null,
  basis: LegalBasisLike | null,
  dataset: ExportDataset,
  requested: unknown,
): ExportCheck {
  if (!purpose || purpose.status !== 'approved' || purpose.dataset !== dataset) {
    return { ok: false, error: 'purpose_not_approved' }
  }
  if (!basis || basis.available === false) return { ok: false, error: 'legal_basis' }
  const allowed = new Set(purposeColumnKeys(purpose))
  const wanted = Array.isArray(requested) ? requested : []
  if (!wanted.length || wanted.some((key) => typeof key !== 'string' || !allowed.has(key))) {
    return { ok: false, error: 'columns' }
  }
  const set = new Set(wanted as string[])
  return { ok: true, columns: EXPORT_COLUMNS[dataset].filter((c) => set.has(c.key)) }
}
