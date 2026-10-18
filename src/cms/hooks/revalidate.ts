import { revalidatePath } from 'next/cache'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
  PayloadRequest,
} from 'payload'

/**
 * Pages are rendered on first visit and then served from cache. After any content change the
 * whole site (all languages) is marked stale and re-rendered on its next visit — simple and
 * always correct for a site of this size. Scripts outside Next.js (seed, test fixtures) pass
 * `context: { disableRevalidate: true }`.
 *
 * '/' with 'layout' is the root layout tag every cached page carries. (A pattern such as
 * '/[locale]' would not match: cache tags are derived from the file path, which includes the
 * "(frontend)" route group.)
 */
function revalidateSite(req: PayloadRequest) {
  if (req.context?.disableRevalidate) return
  try {
    revalidatePath('/', 'layout')
  } catch (error) {
    req.payload.logger.warn({ err: error }, 'Could not mark cached pages as stale')
  }
}

export const revalidateAfterChange: CollectionAfterChangeHook = ({ doc, req }) => {
  revalidateSite(req)
  return doc
}

export const revalidateAfterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  revalidateSite(req)
  return doc
}

export const revalidateGlobal: GlobalAfterChangeHook = ({ doc, req }) => {
  revalidateSite(req)
  return doc
}
