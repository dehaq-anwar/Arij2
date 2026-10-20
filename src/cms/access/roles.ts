import type { Access, FieldAccess, PayloadRequest } from 'payload'

import { isVerifiedSession } from '../auth/session-state'
import { can, type Permission, type PermissionSubject } from './permissions'

export { can, type Permission } from './permissions'

/**
 * True if the request comes from a person signed in with both factors whose role (minus their
 * restrictions) includes the permission. Server code that runs without a person (forms, jobs,
 * seed scripts) uses the Local API with its default overrideAccess and does not come here.
 */
export async function allowed(req: PayloadRequest, permission: Permission): Promise<boolean> {
  if (!req.user || !can(req.user as PermissionSubject, permission)) return false
  return isVerifiedSession(req)
}

/** Collection or global access for one permission. */
export const allow =
  (permission: Permission): Access =>
  ({ req }) =>
    allowed(req, permission)

export const allowField =
  (permission: Permission): FieldAccess =>
  ({ req }) =>
    allowed(req, permission)

/** Visitors see published documents only; people with `content.read` see drafts too. */
export const publishedOrContentReader: Access = async ({ req }) =>
  (await allowed(req, 'content.read')) ? true : { _status: { equals: 'published' } }

/** Never through the API: the website's forms and server code write with the Local API. */
export const nobody: Access = () => false
