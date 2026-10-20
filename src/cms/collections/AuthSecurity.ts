import type { CollectionConfig } from 'payload'

import { nobody } from '../access/roles'

/**
 * Records behind two-factor sign-in (src/cms/auth). None of them can be read or changed through
 * the API or the admin by anyone: only server code (the sign-in endpoints, the security screen)
 * uses them, with the Local API. They are kept out of the account document on purpose: Payload
 * rewrites the whole account when someone signs in, which could overwrite them.
 */
const closed = { create: nobody, read: nobody, update: nobody, delete: nobody }

/** One per sign-in: pending after the password, active after the second factor, then ended. */
export const AuthSessions: CollectionConfig = {
  slug: 'auth-sessions',
  admin: { hidden: true },
  access: closed,
  lockDocuments: false,
  fields: [
    { name: 'sid', type: 'text', required: true, unique: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      index: true,
      options: ['pending', 'active', 'ended'],
    },
    /** Pending: the second factor must be given before this time. */
    { name: 'expiresAt', type: 'date', required: true },
    { name: 'attempts', type: 'number', defaultValue: 0 },
    /** Set while the account sets up its authenticator app (encrypted). */
    { name: 'enrollmentSecret', type: 'text' },
    { name: 'verifiedAt', type: 'date' },
    { name: 'method', type: 'select', options: ['totp', 'recovery', 'enrollment'] },
    { name: 'stepUpAt', type: 'date' },
    { name: 'lastSeenAt', type: 'date' },
    { name: 'browser', type: 'text' },
    { name: 'os', type: 'text' },
    { name: 'deviceClass', type: 'text' },
    { name: 'deviceHash', type: 'text' },
    { name: 'endedAt', type: 'date' },
    {
      name: 'endReason',
      type: 'select',
      options: ['logout', 'revoked', 'expired', 'failed', 'cancelled', 'disabled', 'mfaReset'],
    },
  ],
}

/** The second factor of an account: authenticator secret and recovery codes. */
export const AuthCredentials: CollectionConfig = {
  slug: 'auth-mfa',
  admin: { hidden: true },
  access: closed,
  lockDocuments: false,
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      unique: true,
    },
    /** AES-256-GCM, bound to the account (src/cms/auth/crypto.ts). */
    { name: 'secret', type: 'text', required: true },
    { name: 'enabledAt', type: 'date', required: true },
    /** Time step of the last accepted code; older or equal steps are refused. */
    { name: 'lastStep', type: 'number', required: true, defaultValue: -1 },
    { name: 'failures', type: 'number', defaultValue: 0 },
    { name: 'failuresSince', type: 'date' },
    { name: 'lockedUntil', type: 'date' },
    {
      name: 'recoveryCodes',
      type: 'array',
      fields: [
        { name: 'hash', type: 'text', required: true },
        { name: 'usedAt', type: 'date' },
      ],
    },
  ],
}

/** Devices an account signed in from before (only a keyed hash of the device cookie). */
export const TrustedDevices: CollectionConfig = {
  slug: 'trusted-devices',
  admin: { hidden: true },
  access: closed,
  lockDocuments: false,
  indexes: [{ fields: ['user', 'deviceHash'], unique: true }],
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'deviceHash', type: 'text', required: true },
    { name: 'browser', type: 'text' },
    { name: 'os', type: 'text' },
    { name: 'deviceClass', type: 'text' },
    { name: 'lastSeenAt', type: 'date' },
  ],
}
