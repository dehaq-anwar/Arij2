import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'

import { ContactMessages } from '@/cms/collections/ContactMessages'
import { MembershipApplications } from '@/cms/collections/MembershipApplications'
import { retentionCutoff } from '@/cms/jobs/retention'
import { notifyNewSubmission } from '@/lib/forms/notify'
import { bucketKey, clientAddress } from '@/lib/forms/rate-limit'
import { checkFormToken, issueFormToken, MAX_AGE_MS, MIN_FILL_MS } from '@/lib/forms/token'
import { CONTACT_TOPICS, MEMBERSHIP_TYPES } from '@/lib/forms/types'
import { validateContact, validateMembership, type Read } from '@/lib/forms/validation'

const SECRET = 'test-secret-with-enough-length-0123456789'
const read =
  (values: Record<string, string>): Read =>
  (name) =>
    values[name] ?? ''

const validMembership = {
  firstName: 'Lina',
  lastName: 'Beispiel',
  email: 'lina@example.org',
  street: 'Musterweg 1',
  postalCode: '91052',
  city: 'Erlangen',
  country: 'Deutschland',
  membershipType: 'ordinary',
  atLeast16: 'on',
  principles: 'on',
  fees: 'on',
  consent: 'on',
}

describe('form token (signed timestamp)', () => {
  const now = 1_800_000_000_000
  const token = issueFormToken('contact', now, SECRET)

  it('accepts a form filled in at human speed', () => {
    expect(checkFormToken('contact', token, now + MIN_FILL_MS, SECRET)).toBe('ok')
  })

  it('flags submissions that are too fast or too old', () => {
    expect(checkFormToken('contact', token, now + 500, SECRET)).toBe('too-fast')
    expect(checkFormToken('contact', token, now + MAX_AGE_MS + 1, SECRET)).toBe('expired')
  })

  it('rejects forged, foreign and malformed tokens', () => {
    expect(checkFormToken('membership', token, now + 5000, SECRET)).toBe('invalid')
    expect(checkFormToken('contact', token, now + 5000, 'another-secret')).toBe('invalid')
    expect(checkFormToken('contact', `${now - 10_000}.${token.split('.')[1]}`, now, SECRET)).toBe(
      'invalid',
    )
    expect(checkFormToken('contact', '', now, SECRET)).toBe('invalid')
    expect(checkFormToken('contact', 'abc.def', now, SECRET)).toBe('invalid')
    expect(checkFormToken('contact', token, now + 5000, '')).toBe('invalid')
  })
})

describe('membership validation', () => {
  it('accepts the Satzung fields and drops guardian details for adults', () => {
    const result = validateMembership(
      read({ ...validMembership, guardianName: 'Typed before', guardianEmail: 'x@example.org' }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toEqual({
      firstName: 'Lina',
      lastName: 'Beispiel',
      email: 'lina@example.org',
      address: {
        street: 'Musterweg 1',
        postalCode: '91052',
        city: 'Erlangen',
        country: 'Deutschland',
      },
      membershipType: 'ordinary',
      declarations: { atLeast16: true, principles: true, fees: true },
      under18: false,
    })
  })

  it('requires the guardian’s name and e-mail for applicants under 18', () => {
    const missing = validateMembership(read({ ...validMembership, under18: 'on' }))
    expect(missing.ok).toBe(false)
    if (!missing.ok)
      expect(missing.errors).toEqual({ guardianName: 'required', guardianEmail: 'required' })

    const given = validateMembership(
      read({
        ...validMembership,
        under18: 'on',
        guardianName: 'Sam',
        guardianEmail: 'sam@example.org',
      }),
    )
    expect(given.ok && given.data.guardian).toEqual({ name: 'Sam', email: 'sam@example.org' })
  })

  it('requires every declaration and a known membership type', () => {
    const result = validateMembership(
      read({
        ...validMembership,
        atLeast16: '',
        principles: '',
        fees: 'yes',
        consent: '',
        membershipType: 'honorary',
      }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual({
      atLeast16: 'accept',
      principles: 'accept',
      fees: 'accept',
      consent: 'accept',
      membershipType: 'choice',
    })
    // The entered values come back so the form can be shown again.
    expect(result.values.firstName).toBe('Lina')
  })

  it('checks e-mail format and length, and cleans the input', () => {
    const result = validateMembership(
      read({
        ...validMembership,
        email: 'not-an-address',
        firstName: '  Li‮na\u0007  ',
        lastName: 'x'.repeat(101),
      }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual({ email: 'email', lastName: 'tooLong' })
    // Control characters and invisible direction overrides are removed.
    expect(result.values.firstName).toBe('Lina')
  })
})

describe('contact validation', () => {
  const valid = {
    name: 'Sam',
    email: 'sam@example.org',
    topic: 'press',
    message: 'Hallo\r\n\r\n\r\n\r\nWelt',
    consent: 'on',
  }

  it('accepts a message and keeps its paragraphs', () => {
    const result = validateContact(read(valid))
    expect(result.ok && result.data).toEqual({
      name: 'Sam',
      email: 'sam@example.org',
      topic: 'press',
      message: 'Hallo\n\nWelt',
    })
  })

  it('requires consent, a known topic and at most 5000 characters', () => {
    const result = validateContact(
      read({ ...valid, consent: '', topic: 'spam', message: 'x'.repeat(5001) }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.errors).toEqual({ consent: 'accept', topic: 'choice', message: 'tooLong' })
  })
})

describe('rate limiting', () => {
  it('uses the address added by our own proxy (the last X-Forwarded-For entry)', () => {
    const headers = (value?: string) => new Headers(value ? { 'x-forwarded-for': value } : {})
    expect(clientAddress(headers('203.0.113.9'))).toBe('203.0.113.9')
    expect(clientAddress(headers('1.2.3.4, 203.0.113.9'))).toBe('203.0.113.9')
    expect(clientAddress(headers())).toBe('unknown')
  })

  it('stores keys that reveal nothing and change every day', () => {
    const day = new Date('2026-10-19T10:00:00Z')
    const key = bucketKey('contact', '10m', '203.0.113.9', day)
    expect(key).not.toContain('203')
    expect(bucketKey('contact', '10m', '203.0.113.9', new Date('2026-10-19T23:59:00Z'))).toBe(key)
    expect(bucketKey('contact', '10m', '203.0.113.10', day)).not.toBe(key)
    expect(bucketKey('membership', '10m', '203.0.113.9', day)).not.toBe(key)
    expect(bucketKey('contact', '10m', '203.0.113.9', new Date('2026-10-20T00:01:00Z'))).not.toBe(
      key,
    )
  })
})

describe('retention', () => {
  it('keeps submissions for six calendar months', () => {
    const cutoff = (iso: string) => retentionCutoff(new Date(iso)).toISOString()
    expect(cutoff('2026-10-19T03:00:00.000Z')).toBe('2026-04-19T03:00:00.000Z')
    expect(cutoff('2026-08-31T03:00:00.000Z')).toBe('2026-02-28T03:00:00.000Z')
    expect(cutoff('2027-01-15T03:00:00.000Z')).toBe('2026-07-15T03:00:00.000Z')
  })
})

describe('form options match the CMS', () => {
  const optionsOf = (fields: unknown[], name: string): string[] => {
    for (const field of fields as {
      name?: string
      fields?: unknown[]
      options?: { value: string }[]
    }[]) {
      if (field.name === name) return field.options!.map((o) => o.value)
      if (field.fields) {
        const found = optionsOf(field.fields, name)
        if (found.length) return found
      }
    }
    return []
  }

  it('topics and membership types are the same in form and collection', () => {
    expect(optionsOf(ContactMessages.fields, 'topic')).toEqual([...CONTACT_TOPICS])
    expect(optionsOf(MembershipApplications.fields, 'membershipType')).toEqual([
      ...MEMBERSHIP_TYPES,
    ])
  })
})

describe('notification e-mail', () => {
  it('links to the entry and contains no personal data', async () => {
    const sent: { to: string; subject: string; text: string }[] = []
    const payload = {
      sendEmail: async (message: (typeof sent)[number]) => void sent.push(message),
      logger: { warn: () => undefined },
    } as unknown as Payload
    const previous = { notify: process.env.NOTIFY_EMAIL, url: process.env.SERVER_URL }
    process.env.NOTIFY_EMAIL = 'info@yop-ye.org'
    process.env.SERVER_URL = 'https://yop-ye.org'
    try {
      await notifyNewSubmission(payload, 'membership-applications', 42)
    } finally {
      // (Assigning undefined would store the string "undefined".)
      for (const [name, value] of [
        ['NOTIFY_EMAIL', previous.notify],
        ['SERVER_URL', previous.url],
      ] as const) {
        if (value === undefined) delete process.env[name]
        else process.env[name] = value
      }
    }
    expect(sent).toHaveLength(1)
    expect(sent[0]!.to).toBe('info@yop-ye.org')
    expect(sent[0]!.text).toContain(
      'https://yop-ye.org/admin/collections/membership-applications/42',
    )
    // The only variable part is the link: no names, addresses or message text can get in.
    expect(sent[0]!.text.replace(/https:\/\/\S+/, '')).not.toMatch(/\d/)
  })
})
