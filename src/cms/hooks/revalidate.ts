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

/**
 * A draft of something never published is not on the site: autosaving it (every two seconds
 * while editing) or creating it (the create screen does that on opening) changes no cached
 * page. Publishing, unpublishing and any change to a published document still do.
 */
type Versioned = { _status?: 'draft' | 'published' | null } | null | undefined
const draftOnly = (doc: Versioned, previousDoc: Versioned) =>
  doc?._status === 'draft' && previousDoc?._status !== 'published'

export const revalidateAfterChange: CollectionAfterChangeHook = ({ doc, previousDoc, req }) => {
  if (!draftOnly(doc, previousDoc)) revalidateSite(req)
  return doc
}

export const revalidateAfterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  revalidateSite(req)
  return doc
}

export const revalidateGlobal: GlobalAfterChangeHook = ({ doc, previousDoc, req }) => {
  if (!draftOnly(doc, previousDoc)) revalidateSite(req)
  return doc
}
