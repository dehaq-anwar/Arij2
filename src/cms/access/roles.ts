import type { Access, FieldAccess } from 'payload'

export const ROLES = ['admin', 'editor', 'board'] as const
export type Role = (typeof ROLES)[number]

type MaybeUser = { role?: Role | null } | null | undefined

export const hasRole = (user: MaybeUser, ...roles: Role[]): boolean =>
  Boolean(user?.role && roles.includes(user.role))

export const isAdmin: Access = ({ req: { user } }) => hasRole(user, 'admin')

export const isEditor: Access = ({ req: { user } }) => hasRole(user, 'admin', 'editor')

export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (hasRole(user, 'admin')) return true
  return { id: { equals: user.id } }
}

export const isAdminField: FieldAccess = ({ req: { user } }) => hasRole(user, 'admin')

/** Visitors see published documents only; editors see drafts too. */
export const publishedOrEditor: Access = ({ req: { user } }) =>
  hasRole(user, 'admin', 'editor') ? true : { _status: { equals: 'published' } }

export const isEditorField: FieldAccess = ({ req: { user } }) => hasRole(user, 'admin', 'editor')

/** Membership applications and contact messages: the board and administrators only. */
export const isBoardOrAdmin: Access = ({ req: { user } }) => hasRole(user, 'admin', 'board')

/** Never through the API: the website's forms write with the Local API on the server. */
export const nobody: Access = () => false
