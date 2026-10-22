import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  auditAreasOf,
  can,
  LIMITED_ROLES,
  permissionsOf,
  PERMISSIONS,
  ROLES,
  validRestrictions,
  type Permission,
  type Role,
} from '@/cms/access/permissions'
import { describeChange } from '@/cms/audit/log'
import {
  decryptSecret,
  encryptSecret,
  hashRecoveryCode,
  newRecoveryCode,
  normalizeRecoveryCode,
  safeEqual,
} from '@/cms/auth/crypto'
import { adminTexts, formatDateTime, greeting } from '@/cms/admin/i18n'
import { describeDevice } from '@/cms/auth/device'
import { sidOfToken } from '@/cms/auth/sessions'
import { formatSecret, totpCode, totpStep, totpUri, verifyTotp } from '@/cms/auth/totp'
import { decideHost, type HostRequest } from '@/lib/admin-host'

const saved = { secret: process.env.PAYLOAD_SECRET, key: process.env.MFA_ENCRYPTION_KEY }
beforeEach(() => {
  process.env.PAYLOAD_SECRET = 'unit-test-secret-0123456789abcdef'
  delete process.env.MFA_ENCRYPTION_KEY
})
afterEach(() => {
  for (const [name, value] of [
    ['PAYLOAD_SECRET', saved.secret],
    ['MFA_ENCRYPTION_KEY', saved.key],
  ] as const) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
})

describe('TOTP (RFC 6238, HMAC-SHA1, 6 digits, 30 s)', () => {
  // RFC 6238 appendix B, SHA-1 column; the 8-digit reference values cut to 6 digits.
  const secret = Buffer.from('12345678901234567890', 'ascii')
  const vectors: [number, string][] = [
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
    [20000000000, '353130'],
  ]

  it.each(vectors)('matches the reference value at T = %i', (seconds, expected) => {
    expect(totpCode(secret, totpStep(seconds * 1000))).toBe(expected)
  })

  it('accepts the previous, current and next step and returns which one', () => {
    const now = 1_700_000_000_000
    const step = totpStep(now)
    for (const offset of [-1, 0, 1]) {
      expect(verifyTotp(secret, totpCode(secret, step + offset), -1, now)).toBe(step + offset)
    }
  })

  it('refuses codes further away than one step', () => {
    const now = 1_700_000_000_000
    const step = totpStep(now)
    expect(verifyTotp(secret, totpCode(secret, step - 2), -1, now)).toBeNull()
    expect(verifyTotp(secret, totpCode(secret, step + 2), -1, now)).toBeNull()
  })

  it('refuses a code that was already used, and older ones (no replay)', () => {
    const now = 1_700_000_000_000
    const step = totpStep(now)
    const code = totpCode(secret, step)
    expect(verifyTotp(secret, code, step, now)).toBeNull()
    expect(verifyTotp(secret, totpCode(secret, step - 1), step, now)).toBeNull()
    expect(verifyTotp(secret, totpCode(secret, step + 1), step, now)).toBe(step + 1)
  })

  it('accepts surrounding spaces but nothing that is not six ASCII digits, without throwing', () => {
    const now = 1_700_000_000_000
    const code = totpCode(secret, totpStep(now))
    expect(verifyTotp(secret, ` ${code} `, -1, now)).not.toBeNull()
    for (const input of [
      '',
      '12345',
      '1234567',
      'abcdef',
      '١٢٣٤٥٦',
      '12345é',
      `${code.slice(0, 5)}x`,
    ]) {
      expect(() => verifyTotp(secret, input, -1, now)).not.toThrow()
      expect(verifyTotp(secret, input, -1, now)).toBeNull()
    }
  })

  it('builds the setup address authenticator apps understand', () => {
    const uri = totpUri(secret, 'person@example.test')
    expect(uri).toMatch(/^otpauth:\/\/totp\/Youth%20of%20Peace:person%40example\.test\?/)
    expect(uri).toContain('secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
    expect(uri).toContain('algorithm=SHA1&digits=6&period=30')
    expect(formatSecret(secret)).toBe('GEZD GNBV GY3T QOJQ GEZD GNBV GY3T QOJQ')
  })

  it('reads the secret bytes exactly, also from a slice of a larger buffer', () => {
    const pooled = Buffer.concat([Buffer.alloc(7, 1), secret, Buffer.alloc(9, 2)])
    const slice = pooled.subarray(7, 27)
    expect(totpCode(slice, totpStep(59_000))).toBe('287082')
  })
})

describe('secrets and recovery codes', () => {
  it('encrypts secrets bound to the account', () => {
    const secret = Buffer.from('0123456789abcdefghij')
    const sealed = encryptSecret(secret, 7)
    expect(sealed).toMatch(/^v1\./)
    expect(sealed).not.toContain(secret.toString('base64url'))
    expect(decryptSecret(sealed, 7).equals(secret)).toBe(true)
    expect(() => decryptSecret(sealed, 8)).toThrow()
  })

  it('detects any change to the stored secret', () => {
    const sealed = encryptSecret(Buffer.from('0123456789abcdefghij'), 7)
    const parts = sealed.split('.')
    const data = Buffer.from(parts[3]!, 'base64url')
    data[0] = data[0]! ^ 1
    parts[3] = data.toString('base64url')
    expect(() => decryptSecret(parts.join('.'), 7)).toThrow()
  })

  it('uses MFA_ENCRYPTION_KEY when it is set', () => {
    const secret = Buffer.from('0123456789abcdefghij')
    const sealed = encryptSecret(secret, 1)
    process.env.MFA_ENCRYPTION_KEY = 'another-key-0123456789abcdef0123456789'
    expect(() => decryptSecret(sealed, 1)).toThrow()
  })

  it('makes readable codes and accepts them in any reasonable typing', () => {
    const code = newRecoveryCode()
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/)
    expect(normalizeRecoveryCode(code)).toBe(code.replace('-', ''))
    expect(normalizeRecoveryCode(' ab0cd-ef1gh ')).toBe('AB0CDEF1GH')
    expect(normalizeRecoveryCode('abocd-efigh')).toBe('AB0CDEF1GH')
    expect(normalizeRecoveryCode('ABCDE-FGHJ')).toBeNull()
    expect(normalizeRecoveryCode('ABCDE-FGHJU')).toBeNull()
  })

  it('stores codes only as keyed hashes that differ per account', () => {
    const normalized = 'AB0CDEF1GH'
    expect(hashRecoveryCode(normalized, 1)).toBe(hashRecoveryCode(normalized, 1))
    expect(hashRecoveryCode(normalized, 1)).not.toBe(hashRecoveryCode(normalized, 2))
    expect(hashRecoveryCode(normalized, 1)).not.toContain(normalized)
  })

  it('compares strings of any length safely', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
  })
})

describe('roles and permissions', () => {
  const expected: Record<Role, Permission[]> = {
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
      'analytics.read',
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
    technicalAdmin: [
      'operations.read',
      'operations.act',
      'email.manage',
      'analytics.read',
      'jobs.run',
      'audit.read',
    ],
    auditor: [
      'content.read',
      'operations.read',
      'analytics.read',
      'users.read',
      'audit.read',
      'exports.review',
    ],
  }

  it.each(ROLES)('%s has exactly the permissions of the matrix', (role) => {
    expect([...permissionsOf({ role })].sort()).toEqual([...expected[role]].sort())
  })

  it('keeps the technical administrator away from association data', () => {
    for (const permission of [
      'inbox.read',
      'inbox.write',
      'personalData.export',
      'applications.delete',
      'messages.delete',
      'members.read',
      'members.write',
      'members.delete',
      'exports.review',
    ] as const) {
      expect(can({ role: 'technicalAdmin' }, permission)).toBe(false)
    }
    expect(auditAreasOf({ role: 'technicalAdmin' })).toEqual(['operations'])
  })

  it('gives content editors neither personal data nor operations nor accounts', () => {
    for (const permission of PERMISSIONS.filter((p) => !p.startsWith('content.'))) {
      expect(can({ role: 'contentEditor' }, permission)).toBe(false)
    }
  })

  it('narrows a role with restrictions, never widens it', () => {
    const board = { role: 'boardAdmin', restrictions: ['personalData.export', 'users.manage'] }
    expect(can(board, 'personalData.export')).toBe(false)
    expect(can(board, 'inbox.read')).toBe(true)
    expect(can(board, 'users.manage')).toBe(false)
    expect(
      validRestrictions('boardAdmin', ['personalData.export', 'users.manage', 'nonsense']),
    ).toEqual(['personalData.export'])
  })

  it('gives deactivated accounts, unknown roles and nobody any permission', () => {
    expect(permissionsOf({ role: 'superAdmin', disabled: true }).size).toBe(0)
    expect(permissionsOf({ role: 'admin' }).size).toBe(0)
    expect(permissionsOf(null).size).toBe(0)
  })

  it('lets board administrators manage only editors and membership managers', () => {
    expect([...LIMITED_ROLES].sort()).toEqual(['contentEditor', 'membershipManager'])
    expect(auditAreasOf({ role: 'boardAdmin' })).toEqual(['users', 'content', 'association'])
    expect(auditAreasOf({ role: 'auditor' })).toHaveLength(5)
    expect(auditAreasOf({ role: 'contentEditor' })).toEqual([])
  })
})

describe('admin host separation', () => {
  const settings = { adminUrl: 'https://verwaltung.yop-ye.org', siteUrl: 'https://yop-ye.org' }
  const request = (
    host: string,
    pathname: string,
    method = 'GET',
    gate: string | null = null,
  ): HostRequest => ({
    host,
    method,
    pathname,
    search: '',
    gate,
  })

  it('serves the admin and the API only on the admin host', () => {
    expect(decideHost(request('verwaltung.yop-ye.org', '/admin'), settings).kind).toBe('admin')
    expect(
      decideHost(request('verwaltung.yop-ye.org', '/api/users/login', 'POST'), settings).kind,
    ).toBe('admin')
    expect(decideHost(request('yop-ye.org', '/admin'), settings).kind).toBe('notFound')
    expect(decideHost(request('yop-ye.org', '/admin/login'), settings).kind).toBe('notFound')
    expect(decideHost(request('yop-ye.org', '/api/users/login', 'POST'), settings).kind).toBe(
      'notFound',
    )
    expect(decideHost(request('yop-ye.org', '/api/projects'), settings).kind).toBe('notFound')
    expect(decideHost(request('www.yop-ye.org', '/administrator'), settings).kind).toBe('site')
  })

  it('lets the website load its media files, read-only', () => {
    expect(decideHost(request('yop-ye.org', '/api/media/file/photo.jpg'), settings).kind).toBe(
      'admin',
    )
    expect(
      decideHost(request('yop-ye.org', '/api/media/file/photo.jpg', 'DELETE'), settings).kind,
    ).toBe('notFound')
  })

  it('sends website pages on the admin host to the website', () => {
    expect(decideHost(request('verwaltung.yop-ye.org', '/'), settings)).toEqual({
      kind: 'redirect',
      location: '/admin',
    })
    expect(decideHost(request('verwaltung.yop-ye.org', '/kontakt'), settings)).toEqual({
      kind: 'redirect',
      location: 'https://yop-ye.org/kontakt',
    })
  })

  it('requires the reverse proxy gate when one is configured', () => {
    const gated = { ...settings, gateSecret: 'gate-0123456789' }
    expect(decideHost(request('verwaltung.yop-ye.org', '/admin'), gated).kind).toBe('notFound')
    expect(decideHost(request('verwaltung.yop-ye.org', '/admin', 'GET', 'wrong'), gated).kind).toBe(
      'notFound',
    )
    expect(
      decideHost(request('verwaltung.yop-ye.org', '/admin', 'GET', 'gate-0123456789'), gated).kind,
    ).toBe('admin')
  })

  it('changes nothing without ADMIN_URL (development)', () => {
    expect(decideHost(request('localhost:3000', '/admin'), {}).kind).toBe('site')
  })
})

describe('helpers', () => {
  it("greets and shows times in the association's time zone, not the server's", () => {
    const t = adminTexts.de
    // 08:30 UTC is 10:30 in Berlin (summer time), 11:00 UTC is 13:00, 16:30 UTC is 18:30.
    expect(greeting(t, new Date('2026-07-01T08:30:00Z'))).toBe(t.greetingMorning)
    expect(greeting(t, new Date('2026-10-20T11:00:00Z'))).toBe(t.greetingDay)
    expect(greeting(t, new Date('2026-10-20T16:30:00Z'))).toBe(t.greetingEvening)
    expect(formatDateTime('2026-10-20T11:02:00Z', 'de')).toBe('20.10.2026, 13:02')
    expect(formatDateTime('2026-12-20T11:02:00Z', 'de')).toBe('20.12.2026, 12:02')
  })

  it('describes devices coarsely', () => {
    expect(
      describeDevice(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 Edg/140.0',
      ),
    ).toEqual({ browser: 'Edge', os: 'Windows', deviceClass: 'desktop' })
    expect(
      describeDevice(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      ),
    ).toEqual({ browser: 'Safari', os: 'iOS', deviceClass: 'mobile' })
    expect(describeDevice(null)).toEqual({ browser: 'Other', os: 'Other', deviceClass: 'desktop' })
  })

  it('reads the session id from a token', () => {
    const claims = Buffer.from(JSON.stringify({ id: 1, collection: 'users', sid: 'abc' })).toString(
      'base64url',
    )
    expect(sidOfToken(`header.${claims}.signature`)).toBe('abc')
    expect(sidOfToken('nonsense')).toBeNull()
  })

  it('records which fields changed, with values only for status-like fields', () => {
    const detail = describeChange(
      { name: 'B', role: 'auditor', email: 'x@example.test', updatedAt: '2' },
      { name: 'A', role: 'contentEditor', email: 'x@example.test', updatedAt: '1' },
    )
    expect(detail).toEqual({
      fields: ['name', 'role'],
      role: { from: 'contentEditor', to: 'auditor' },
    })
  })
})
