import type { BlocksField, PayloadRequest } from 'payload'

import type { SystemPage } from '@/lib/site-routes'

import { label, localizedMessage, type AdminLabel } from '../lib/labels'
import { FORM_BLOCKS, OPENING_BLOCKS } from './index'

/**
 * Rules for the order of blocks that keep every page within the design: one opening at the top
 * (the fixed site header needs it), the large home stage only on the home page, and the two
 * forms only on their own page, exactly once there. Checked when saving, also through the API.
 */
export const MAX_BLOCKS = 30

export type LayoutProblem =
  | 'empty'
  | 'openingFirst'
  | 'oneOpening'
  | 'heroHomeOnly'
  | 'formWrongPage'
  | 'formMissing'
  | 'formTwice'
  | 'tooMany'

type Row = { blockType?: string }

export function layoutProblems(
  layout: readonly Row[] | null | undefined,
  systemKey: SystemPage | null | undefined,
): LayoutProblem[] {
  const types = (layout ?? []).map((row) => row.blockType ?? '')
  const problems = new Set<LayoutProblem>()
  if (!types.length) return ['empty']
  if (types.length > MAX_BLOCKS) problems.add('tooMany')
  const openings = types.filter((type) => (OPENING_BLOCKS as readonly string[]).includes(type))
  if (!(OPENING_BLOCKS as readonly string[]).includes(types[0]!)) problems.add('openingFirst')
  if (openings.length > 1) problems.add('oneOpening')
  if (types.includes('hero') && systemKey !== 'home') problems.add('heroHomeOnly')
  for (const [type, page] of Object.entries(FORM_BLOCKS)) {
    const count = types.filter((t) => t === type).length
    if (count && systemKey !== page) problems.add('formWrongPage')
    if (systemKey === page && count === 0) problems.add('formMissing')
    if (count > 1) problems.add('formTwice')
  }
  return [...problems]
}

export const LAYOUT_MESSAGES: Record<LayoutProblem, AdminLabel> = {
  empty: label(
    'Die Seite braucht mindestens einen Block, beginnend mit einem Seitenkopf.',
    'The page needs at least one block, starting with a page header.',
    'تحتاج الصفحة إلى كتلة واحدة على الأقل تبدأ برأس الصفحة.',
  ),
  openingFirst: label(
    'Der erste Block muss ein Seitenkopf sein (Seitenkopf, Seitenkopf mit Bild oder Startbühne).',
    'The first block must be a page opening (page header, header with image or home stage).',
    'يجب أن تكون الكتلة الأولى بداية للصفحة (رأس الصفحة أو رأس بصورة أو واجهة الصفحة الرئيسية).',
  ),
  oneOpening: label(
    'Eine Seite hat nur einen Seitenkopf.',
    'A page has only one page opening.',
    'للصفحة بداية واحدة فقط.',
  ),
  heroHomeOnly: label(
    'Die Startbühne ist der Startseite vorbehalten. Bitte einen Seitenkopf verwenden.',
    'The home stage is reserved for the home page. Please use a page header.',
    'واجهة الصفحة الرئيسية مخصصة لها فقط. يرجى استخدام رأس الصفحة.',
  ),
  formWrongPage: label(
    'Das Antrags- und das Kontaktformular gehören auf ihre eigenen Seiten („Mitglied werden“, „Kontakt“).',
    'The membership and contact forms belong on their own pages ("Membership", "Contact").',
    'نموذجا العضوية والتواصل مكانهما صفحتاهما («العضوية» و«تواصل معنا»).',
  ),
  formMissing: label(
    'Auf dieser Seite muss das Formular bleiben.',
    'The form must stay on this page.',
    'يجب أن يبقى النموذج في هذه الصفحة.',
  ),
  formTwice: label(
    'Das Formular darf nur einmal auf der Seite stehen.',
    'The form may appear only once on the page.',
    'لا يجوز أن يظهر النموذج إلا مرة واحدة في الصفحة.',
  ),
  tooMany: label(
    `Höchstens ${MAX_BLOCKS} Blöcke pro Seite.`,
    `At most ${MAX_BLOCKS} blocks per page.`,
    `${MAX_BLOCKS} كتلة كحد أقصى في الصفحة.`,
  ),
}

/** The layout field's check: all problems in one message, in the editor's language. */
export const validateLayout: BlocksField['validate'] = (value, args) => {
  const data = (args.data ?? {}) as { systemKey?: SystemPage | null }
  const problems = layoutProblems(value as Row[] | null | undefined, data.systemKey)
  if (!problems.length) return true
  return problems
    .map((problem) => localizedMessage(LAYOUT_MESSAGES[problem], args.req as PayloadRequest))
    .join(' ')
}
