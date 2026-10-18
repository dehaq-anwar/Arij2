import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { isAdmin, isAdminField, isAdminOrSelf } from '../access/roles'
import { groups, label } from '../lib/labels'

/** The very first account (created via the admin's first-user screen) becomes an admin. */
const firstUserIsAdmin: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data
  const { totalDocs } = await req.payload.count({ collection: 'users', req })
  return totalDocs === 0 ? { ...data, role: 'admin' } : data
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
    beforeChange: [firstUserIsAdmin],
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
