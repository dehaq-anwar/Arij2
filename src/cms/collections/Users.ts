import {
  APIError,
  Forbidden,
  ValidationError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeOperationHook,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
} from 'payload'

import { allowAttempt, clientAddress, LIMITS } from '../../lib/forms/rate-limit'
import { isAdmin, isAdminField, isAdminOrSelf } from '../access/roles'
import { groups, label, localizedMessage } from '../lib/labels'

export const MIN_PASSWORD_LENGTH = 12

/**
 * Accounts are created by an administrator, or on the server with `npm run create-admin` (which
 * passes this context flag). Payload's "create first user" screen and endpoint stay closed, so a
 * fresh installation cannot be claimed by whoever finds it first.
 */
export const SERVER_COMMAND = 'serverCommand'

const noSignUp: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation === 'create' && !req.user && !req.context?.[SERVER_COMMAND]) {
    throw new Forbidden(req.t)
  }
  return data
}

const tooShort = (req: Parameters<CollectionBeforeValidateHook>[0]['req']) =>
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
    const allowed = await allowAttempt(
      req.payload,
      operation,
      clientAddress(req.headers),
      LIMITS.login,
    )
    if (!allowed) throw new APIError('Too many attempts. Please try again later.', 429, null, true)
  }
  return args
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: label('Benutzerkonto', 'User', 'مستخدم'),
    plural: label('Benutzerkonten', 'Users', 'المستخدمون'),
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role'],
    group: groups.admin,
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 2 * 60 * 60,
    cookies: {
      sameSite: 'Strict',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  access: {
    create: isAdmin,
    read: isAdminOrSelf,
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  hooks: {
    beforeOperation: [guardAuthOperations],
    beforeValidate: [passwordLength],
    beforeChange: [noSignUp],
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
      defaultValue: 'editor',
      saveToJWT: true,
      label: label('Rolle', 'Role', 'الدور'),
      options: [
        { value: 'admin', label: label('Administration', 'Administrator', 'مسؤول') },
        { value: 'editor', label: label('Redaktion', 'Editor', 'محرر') },
        { value: 'board', label: label('Vorstand', 'Board', 'مجلس الإدارة') },
      ],
      access: {
        create: isAdminField,
        update: isAdminField,
      },
      admin: {
        description: label(
          'Nur Administrator:innen können Rollen vergeben.',
          'Only administrators can assign roles.',
          'المسؤولون وحدهم يمكنهم تعيين الأدوار.',
        ),
      },
    },
  ],
}
