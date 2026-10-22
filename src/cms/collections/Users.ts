import {
  APIError,
  Forbidden,
  ValidationError,
  type Access,
  type CollectionAfterChangeHook,
  type CollectionAfterDeleteHook,
  type CollectionAfterErrorHook,
  type CollectionAfterLoginHook,
  type CollectionAfterLogoutHook,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type CollectionBeforeLoginHook,
  type CollectionBeforeOperationHook,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
  type FieldAccess,
  type PayloadRequest,
  type Where,
} from 'payload'

import { sql } from '@payloadcms/db-postgres'

import { adminUrl } from '@/lib/site'

import { allowAttempt, clientAddress, LIMITS } from '../../lib/forms/rate-limit'
import { permissionLabels, roleLabels } from '../access/labels'
import {
  can,
  isRole,
  LIMITED_ROLES,
  PERMISSIONS,
  ROLES,
  validRestrictions,
  type PermissionSubject,
  type Role,
} from '../access/permissions'
import { allowed } from '../access/roles'
import { audit, describeChange, SKIP_AUDIT } from '../audit/log'
import { authEndpoints } from '../auth/endpoints'
import { getCredential } from '../auth/mfa'
import { sendSecurityNotice } from '../auth/notify'
import { currentSession, hasFreshStepUp, isVerifiedSession } from '../auth/session-state'
import { endAllSessions, holdSession, sidOfToken } from '../auth/sessions'
import { requestDb, SUPER_ADMIN_LOCK } from '../lib/db'
import { NOT_ALLOWED, refuse, STEP_UP_MESSAGE } from '../lib/errors'
import { groups, label, localizedMessage } from '../lib/labels'
import { PASSWORD_RESET_SUBJECT, passwordResetMail } from '../mail/templates'

export const MIN_PASSWORD_LENGTH = 12

/**
 * Accounts are created by an administrator, or on the server with `npm run create-admin` (which
 * passes this context flag). Payload's "create first user" screen and endpoint stay closed, so a
 * fresh installation cannot be claimed by whoever finds it first.
 */
export const SERVER_COMMAND = 'serverCommand'

type Account = PermissionSubject & {
  id: number
  name?: string
  email?: string
  role?: Role
  restrictions?: string[] | null
  disabled?: boolean | null
}

const noSignUp: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation === 'create' && !req.user && !req.context?.[SERVER_COMMAND]) {
    throw new Forbidden(req.t)
  }
  return data
}

const tooShort = (req: PayloadRequest) =>
  new ValidationError(
    {
      collection: 'users',
      errors: [
        {
          path: 'password',
          message: localizedMessage(
            label(
              `Mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`,
              `At least ${MIN_PASSWORD_LENGTH} characters.`,
              `${MIN_PASSWORD_LENGTH} حرفًا على الأقل.`,
            ),
            req,
          ),
        },
      ],
    },
    req.t,
  )

const passwordLength: CollectionBeforeValidateHook = ({ data, req }) => {
  const password = (data as { password?: unknown } | undefined)?.password
  if (typeof password === 'string' && password.length < MIN_PASSWORD_LENGTH) throw tooShort(req)
  return data
}

/**
 * Sign-in and password-reset requests are limited per (hashed) address, on top of Payload's
 * lock after five wrong passwords per account. A new password must meet the length rule too.
 */
const guardAuthOperations: CollectionBeforeOperationHook = async ({ args, operation, req }) => {
  if (operation === 'resetPassword') {
    const password = (args as { data?: { password?: unknown } }).data?.password
    if (typeof password === 'string' && password.length < MIN_PASSWORD_LENGTH) throw tooShort(req)
  }
  if (operation === 'login' || operation === 'forgotPassword') {
    if (req.context?.[SERVER_COMMAND]) return args
    const allowedAttempt = await allowAttempt(
      req.payload,
      operation,
      clientAddress(req.headers),
      LIMITS.login,
    )
    if (!allowedAttempt)
      throw new APIError('Too many attempts. Please try again later.', 429, null, true)
  }
  return args
}

/** Deactivated accounts cannot sign in (their sessions end when they are deactivated). */
const blockDisabled: CollectionBeforeLoginHook = ({ req, user }) => {
  if ((user as Account).disabled) {
    throw refuse(
      req,
      label('Dieses Konto ist deaktiviert.', 'This account is deactivated.', 'هذا الحساب معطّل.'),
    )
  }
  return user
}

/**
 * The password alone never signs anyone in: the session Payload just created is held back until
 * the second factor is given (src/cms/auth/sessions.ts). This hook also runs after a password
 * reset, which in Payload signs the person in as well.
 */
const holdForSecondFactor: CollectionAfterLoginHook = async ({ req, token, user }) => {
  const sid = sidOfToken(token)
  if (!sid) throw new APIError('Sign-in without a session id', 500)
  await holdSession(req, (user as Account).id, sid)
  return user
}

const recordLogout: CollectionAfterLogoutHook = async ({ req }) => {
  const session = await currentSession(req)
  if (session) {
    await req.payload.update({
      collection: 'auth-sessions',
      id: session.id,
      data: { status: 'ended', endedAt: new Date().toISOString(), endReason: 'logout' },
      overrideAccess: true,
      depth: 0,
      req,
    })
    await audit(req.payload, { action: 'auth.logout', area: 'security' }, req)
  }
}

/** Wrong passwords for existing accounts are logged (unknown addresses are not: no value). */
const recordFailedLogin: CollectionAfterErrorHook = async ({ error, req }) => {
  if (!req.url?.includes('/users/login')) return
  const status = (error as { status?: number }).status
  if (status !== 401 && status !== 423) return
  const email = (req.data as { email?: unknown } | undefined)?.email
  if (typeof email !== 'string') return
  const { docs } = await req.payload.find({
    collection: 'users',
    where: { email: { equals: email.trim().toLowerCase() } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const account = docs[0] as Account | undefined
  if (!account) return
  await audit(req.payload, {
    action: status === 423 ? 'auth.account_locked' : 'auth.password_failed',
    area: 'security',
    result: 'failed',
    actor: { id: account.id, name: account.name, role: account.role },
    target: { type: 'users', id: account.id, label: account.name ?? null },
  })
}

const changed = (
  data: Record<string, unknown>,
  original: Record<string, unknown> | undefined,
  key: string,
) => {
  if (!(key in data)) return false
  const normalize = (value: unknown) =>
    JSON.stringify(Array.isArray(value) ? [...value].sort() : (value ?? null))
  return normalize(data[key]) !== normalize(original?.[key])
}

const LAST_SUPER_ADMIN = label(
  'Es muss mindestens eine aktive Super-Administration bleiben.',
  'At least one active super administrator must remain.',
  'يجب أن يبقى مسؤول عام نشط واحد على الأقل.',
)

/**
 * How many other active super administrators there are. Takes a transaction-wide lock first, so
 * that two changes at the same moment (two super administrators demoting each other) are
 * counted one after the other: the second sees the first one's result and is refused. The
 * database trigger `users_keep_super_admin` enforces the same rule with the same lock.
 */
async function otherActiveSuperAdmins(req: PayloadRequest, exceptId: number) {
  await (await requestDb(req)).execute(sql`select pg_advisory_xact_lock(${SUPER_ADMIN_LOCK})`)
  const { totalDocs } = await req.payload.count({
    collection: 'users',
    where: {
      role: { equals: 'superAdmin' },
      disabled: { not_equals: true },
      id: { not_equals: exceptId },
    },
    overrideAccess: true,
    req,
  })
  return totalDocs
}

/**
 * Rules for changing accounts through the admin or the API (server scripts are exempt):
 * - who may assign which role (board administrators only editors and membership managers),
 * - nobody changes their own role, restrictions or deactivation,
 * - passwords of other accounts are never set by someone else after creation,
 * - the last active super administrator cannot be demoted or deactivated,
 * - role, restrictions, deactivation, e-mail and password changes and new accounts need a
 *   fresh second-factor confirmation (step-up).
 */
const guardAccountChanges: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (req.context?.[SERVER_COMMAND] || !req.user) return data
  const actor = req.user as Account
  const original = originalDoc as Account | undefined
  const manage = can(actor, 'users.manage')
  const manageLimited = can(actor, 'users.manageLimited')
  const self = operation === 'update' && original?.id === actor.id
  const nextRole = (data.role ?? original?.role) as Role | undefined

  if (operation === 'create') {
    if (!manage && !(manageLimited && nextRole && LIMITED_ROLES.includes(nextRole))) {
      throw refuse(req, NOT_ALLOWED)
    }
  } else if (
    !self &&
    !manage &&
    !(manageLimited && original?.role && LIMITED_ROLES.includes(original.role))
  ) {
    throw refuse(req, NOT_ALLOWED)
  }

  const roleChanged = operation === 'update' && changed(data, original, 'role')
  if (roleChanged) {
    if (self) throw refuse(req, NOT_ALLOWED)
    if (!manage && !(nextRole && LIMITED_ROLES.includes(nextRole))) throw refuse(req, NOT_ALLOWED)
  }
  if (self && (changed(data, original, 'restrictions') || changed(data, original, 'disabled'))) {
    throw refuse(req, NOT_ALLOWED)
  }
  if (operation === 'update' && !self && typeof data.password === 'string' && data.password) {
    throw refuse(
      req,
      label(
        'Passwörter anderer Konten werden nicht gesetzt; die Person nutzt „Passwort vergessen“.',
        'Passwords of other accounts are not set by others; the person uses “Forgot password”.',
        'لا تُعيَّن كلمات مرور الحسابات الأخرى؛ يستخدم الشخص «نسيت كلمة المرور».',
      ),
    )
  }
  if (isRole(nextRole) && Array.isArray(data.restrictions)) {
    data.restrictions = validRestrictions(nextRole, data.restrictions as string[])
  }

  if (
    operation === 'update' &&
    original?.role === 'superAdmin' &&
    (nextRole !== 'superAdmin' || data.disabled === true) &&
    (await otherActiveSuperAdmins(req, original.id)) === 0
  ) {
    throw refuse(req, LAST_SUPER_ADMIN, 400)
  }

  const sensitive =
    operation === 'create' ||
    roleChanged ||
    changed(data, original, 'restrictions') ||
    changed(data, original, 'disabled') ||
    changed(data, original, 'email') ||
    (typeof data.password === 'string' && data.password.length > 0)
  if (sensitive && !(await hasFreshStepUp(req))) throw refuse(req, STEP_UP_MESSAGE)
  return data
}

const guardDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  if (req.context?.[SERVER_COMMAND] || !req.user) return
  if (String(id) === String(req.user.id)) throw refuse(req, NOT_ALLOWED)
  const target = (await req.payload.findByID({
    collection: 'users',
    id,
    depth: 0,
    overrideAccess: true,
    req,
  })) as Account
  if (target.role === 'superAdmin' && (await otherActiveSuperAdmins(req, target.id)) === 0) {
    throw refuse(req, LAST_SUPER_ADMIN, 400)
  }
  if (!(await hasFreshStepUp(req))) throw refuse(req, STEP_UP_MESSAGE)
}

const afterAccountChange: CollectionAfterChangeHook = async ({
  context,
  doc,
  operation,
  previousDoc,
  req,
}) => {
  const account = doc as Account
  if (operation === 'update' && account.disabled && !(previousDoc as Account)?.disabled) {
    await endAllSessions(req.payload, account.id, 'disabled', undefined, req)
  }
  const passwordChanged = Boolean(context?.passwordChanged)
  if (!context?.[SKIP_AUDIT]) {
    await audit(
      req.payload,
      {
        action: `users.${operation}`,
        area: 'users',
        actor: req.user ? undefined : null,
        target: { type: 'users', id: account.id, label: account.name ?? null },
        stepUp: Boolean(req.user) && (await hasFreshStepUp(req)),
        detail: {
          ...(operation === 'update' ? describeChange(doc, previousDoc) : { role: account.role }),
          ...(passwordChanged ? { password: 'changed' } : {}),
        },
      },
      req,
    )
  }
  if (passwordChanged && operation === 'update' && account.email) {
    await sendSecurityNotice(req.payload, account.email, { kind: 'passwordChanged' })
  }
  return doc
}

/** Remembers (without the password itself) that it changed, for the audit entry and notice. */
const notePasswordChange: CollectionBeforeChangeHook = ({ context, data }) => {
  if (typeof data.password === 'string' && data.password) context.passwordChanged = true
  return data
}

/**
 * Sign-in records go before the account itself: their reference to it is required, so the
 * database could not keep them without it. Same transaction as the deletion.
 */
const removeSecurityRecords: CollectionBeforeDeleteHook = async ({ id, req }) => {
  for (const collection of ['auth-mfa', 'auth-sessions', 'trusted-devices'] as const) {
    await req.payload.delete({
      collection,
      where: { user: { equals: id } },
      overrideAccess: true,
      req,
    })
  }
  await req.payload.delete({
    collection: 'notifications',
    where: { recipient: { equals: id } },
    overrideAccess: true,
    req,
  })
}

const afterAccountDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const account = doc as Account
  await audit(
    req.payload,
    {
      action: 'users.delete',
      area: 'users',
      target: { type: 'users', id: account.id, label: account.name ?? null },
      stepUp: true,
    },
    req,
  )
  return doc
}

/** Payload's admin panel only for verified sessions of active accounts with a valid role. */
const adminPanel = async ({ req }: { req: PayloadRequest }) => {
  const user = req.user as Account | null
  if (!user || user.disabled || !isRole(user.role)) return false
  return isVerifiedSession(req)
}

const readAccounts: Access = async ({ req }) => {
  if (!req.user || !(await isVerifiedSession(req))) return false
  if (can(req.user as Account, 'users.read')) return true
  return { id: { equals: req.user.id } }
}

const updateAccounts: Access = async ({ req }) => {
  if (!req.user || !(await isVerifiedSession(req))) return false
  const actor = req.user as Account
  if (can(actor, 'users.manage')) return true
  const own: Where = { id: { equals: actor.id } }
  if (can(actor, 'users.manageLimited')) {
    return { or: [own, { role: { in: [...LIMITED_ROLES] } }] }
  }
  return own
}

const createAccounts: Access = async ({ req }) =>
  (await allowed(req, 'users.manage')) || (await allowed(req, 'users.manageLimited'))

/** Role, restrictions and deactivation: set by those who manage accounts, never on oneself. */
const manageField: FieldAccess = async ({ doc, req }) => {
  if (!req.user || (doc && doc.id === req.user.id)) return false
  return (await allowed(req, 'users.manage')) || (await allowed(req, 'users.manageLimited'))
}

const manageFieldOnCreate: FieldAccess = async ({ req }) =>
  (await allowed(req, 'users.manage')) || (await allowed(req, 'users.manageLimited'))

/** Two-factor status is visible to the account itself and to those who may see accounts. */
const seeSecurity: FieldAccess = async ({ doc, req }) =>
  Boolean(req.user) && (doc?.id === req.user?.id || (await allowed(req, 'users.read')))

const emailHTML = async (args?: { token?: string }) =>
  passwordResetMail(`${adminUrl()}/admin/reset/${args?.token ?? ''}`).html ?? ''

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: label('Benutzerkonto', 'User', 'مستخدم'),
    plural: label('Benutzer & Rollen', 'Users & roles', 'المستخدمون والأدوار'),
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'mfaEnabled', 'disabled'],
    group: groups.security,
    hidden: ({ user }) => !can(user as PermissionSubject, 'users.read'),
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 2 * 60 * 60,
    cookies: {
      sameSite: 'Strict',
      secure: process.env.NODE_ENV === 'production',
    },
    forgotPassword: {
      generateEmailHTML: emailHTML,
      generateEmailSubject: () => PASSWORD_RESET_SUBJECT,
    },
  },
  endpoints: authEndpoints,
  access: {
    admin: adminPanel,
    create: createAccounts,
    read: readAccounts,
    update: updateAccounts,
    delete: async ({ req }) => allowed(req, 'users.manage'),
    unlock: async ({ req }) => allowed(req, 'users.manage'),
  },
  hooks: {
    beforeOperation: [guardAuthOperations],
    beforeValidate: [passwordLength],
    beforeChange: [noSignUp, guardAccountChanges, notePasswordChange],
    beforeDelete: [guardDelete, removeSecurityRecords],
    beforeLogin: [blockDisabled],
    afterLogin: [holdForSecondFactor],
    afterLogout: [recordLogout],
    afterChange: [afterAccountChange],
    afterDelete: [afterAccountDelete],
    afterError: [recordFailedLogin],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: label('Name', 'Name', 'الاسم'),
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      saveToJWT: true,
      label: label('Rolle', 'Role', 'الدور'),
      options: ROLES.map((value) => ({ value, label: roleLabels[value] })),
      access: { create: manageFieldOnCreate, update: manageField },
      admin: {
        description: label(
          'Bestimmt die Grundrechte (siehe Sicherheit → Rollen). Die eigene Rolle kann niemand ändern.',
          'Sets the basic permissions. Nobody can change their own role.',
          'يحدد الصلاحيات الأساسية. لا يمكن لأحد تغيير دوره بنفسه.',
        ),
      },
    },
    {
      name: 'restrictions',
      type: 'select',
      hasMany: true,
      label: label('Einschränkungen', 'Restrictions', 'القيود'),
      options: PERMISSIONS.map((value) => ({ value, label: permissionLabels[value] })),
      access: { create: manageFieldOnCreate, update: manageField },
      admin: {
        description: label(
          'Rechte, die diese Person trotz ihrer Rolle nicht haben soll. Rechte über die Rolle hinaus gibt es nicht.',
          'Permissions this person should not have despite their role. There are no permissions beyond the role.',
          'صلاحيات لا ينبغي أن يملكها هذا الشخص رغم دوره. لا توجد صلاحيات تتجاوز الدور.',
        ),
      },
    },
    {
      name: 'disabled',
      type: 'checkbox',
      label: label('Deaktiviert', 'Deactivated', 'معطّل'),
      access: { create: manageFieldOnCreate, update: manageField },
      admin: {
        position: 'sidebar',
        components: { Cell: '/cms/admin/users/cells#DisabledCell' },
        description: label(
          'Kann sich nicht mehr anmelden; alle Sitzungen enden sofort.',
          'Can no longer sign in; all sessions end at once.',
          'لا يمكنه تسجيل الدخول بعد الآن؛ تنتهي كل الجلسات فورًا.',
        ),
      },
    },
    {
      name: 'mfaEnabled',
      type: 'checkbox',
      virtual: true,
      label: label('Zwei-Faktor', 'Two-factor', 'التحقق بخطوتين'),
      access: { read: seeSecurity, create: () => false, update: () => false },
      admin: {
        readOnly: true,
        position: 'sidebar',
        components: { Cell: '/cms/admin/users/cells#MfaCell' },
      },
      hooks: {
        afterRead: [
          async ({ data, req }) =>
            data?.id ? Boolean(await getCredential(req.payload, data.id as number, req)) : false,
        ],
      },
    },
    {
      name: 'security',
      type: 'ui',
      label: label('Sicherheit', 'Security', 'الأمان'),
      admin: {
        position: 'sidebar',
        components: { Field: '/cms/admin/users/AccountSecurity#AccountSecurity' },
      },
    },
  ],
}
