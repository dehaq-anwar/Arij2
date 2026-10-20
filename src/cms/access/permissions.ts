/**
 * The Control Center's permission model (docs/CONTROL-CENTER.md §4): six base roles, each a fixed
 * set of permissions. A person can be given fewer permissions than their role ("restrictions"),
 * never more. Everything that decides access — collection rules, admin navigation, custom views,
 * endpoints and the tests — reads this one map.
 */

export const ROLES = [
  'superAdmin',
  'boardAdmin',
  'contentEditor',
  'membershipManager',
  'technicalAdmin',
  'auditor',
] as const
export type Role = (typeof ROLES)[number]

export const PERMISSIONS = [
  /** See all content in the admin, including drafts. */
  'content.read',
  /** Create, edit, publish and delete content, media and page texts. */
  'content.write',
  /** Membership applications and contact messages. */
  'inbox.read',
  'inbox.write',
  'applications.delete',
  'messages.delete',
  /** Members register (CC-1), separate from the applications. */
  'members.read',
  'members.write',
  'members.delete',
  /** Export of personal data (CC-1; always with a recorded purpose, a legal basis and a code). */
  'personalData.export',
  /** Read the register of all exports (oversight; everyone who exports sees their own). */
  'exports.review',
  /** Control Center settings: reminder periods, the legal bases offered for exports. */
  'settings.manage',
  /** Server status, logs, backups (CC-3). */
  'operations.read',
  /** Restarts and restore drills (CC-3). */
  'operations.act',
  /** E-mail settings and test sending (CC-4). */
  'email.manage',
  /** Run the job queue by hand (e.g. the retention job). */
  'jobs.run',
  /** See all accounts, their roles and two-factor status. */
  'users.read',
  /** Create, change and delete any account, reset another person's second factor. */
  'users.manage',
  /** Invite, change and deactivate content editors and membership managers only. */
  'users.manageLimited',
  /** Audit log entries of the areas listed in AUDIT_AREAS. */
  'audit.read',
] as const
export type Permission = (typeof PERMISSIONS)[number]

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  superAdmin: PERMISSIONS.filter((p) => p !== 'users.manageLimited'),
  boardAdmin: [
    'content.read',
    'inbox.read',
    'inbox.write',
    'messages.delete',
    'members.read',
    'members.write',
    'personalData.export',
    'exports.review',
    'operations.read',
    'users.read',
    'users.manageLimited',
    'audit.read',
  ],
  contentEditor: ['content.read', 'content.write'],
  membershipManager: [
    'inbox.read',
    'inbox.write',
    'messages.delete',
    'members.read',
    'members.write',
    'personalData.export',
  ],
  // Deliberately without any access to applications, members or messages.
  technicalAdmin: ['operations.read', 'operations.act', 'email.manage', 'jobs.run', 'audit.read'],
  // Oversight without personal data: the export register holds no personal data.
  auditor: ['content.read', 'operations.read', 'users.read', 'audit.read', 'exports.review'],
}

/** Areas of the audit log; each entry belongs to one. */
export const AUDIT_AREAS = ['security', 'users', 'content', 'association', 'operations'] as const
export type AuditArea = (typeof AUDIT_AREAS)[number]

/** Which audit entries a role may read (everyone also sees their own entries). */
const ROLE_AUDIT_AREAS: Record<Role, readonly AuditArea[]> = {
  superAdmin: AUDIT_AREAS,
  auditor: AUDIT_AREAS,
  boardAdmin: ['users', 'content', 'association'],
  technicalAdmin: ['operations'],
  contentEditor: [],
  membershipManager: [],
}

/** Roles a board administrator may assign, change or deactivate (`users.manageLimited`). */
export const LIMITED_ROLES: readonly Role[] = ['contentEditor', 'membershipManager']

export type PermissionSubject =
  | {
      role?: string | null
      restrictions?: readonly string[] | null
      disabled?: boolean | null
    }
  | null
  | undefined

export const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && (ROLES as readonly string[]).includes(value)

export const rolePermissions = (role: Role): readonly Permission[] => ROLE_PERMISSIONS[role]

/** The permissions a person actually has: their role's set minus their restrictions. */
export function permissionsOf(user: PermissionSubject): Set<Permission> {
  if (!user || user.disabled || !isRole(user.role)) return new Set()
  const removed = new Set(user.restrictions ?? [])
  return new Set(ROLE_PERMISSIONS[user.role].filter((p) => !removed.has(p)))
}

export const can = (user: PermissionSubject, permission: Permission): boolean =>
  permissionsOf(user).has(permission)

export function auditAreasOf(user: PermissionSubject): readonly AuditArea[] {
  if (!can(user, 'audit.read') || !isRole(user?.role)) return []
  return ROLE_AUDIT_AREAS[user.role]
}

/** Restrictions that make sense for a role: only permissions it has can be taken away. */
export const validRestrictions = (role: Role, restrictions: readonly string[]): Permission[] =>
  ROLE_PERMISSIONS[role].filter((p) => restrictions.includes(p))
