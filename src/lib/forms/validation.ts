import { CONTACT_TOPICS, MEMBERSHIP_TYPES, type ErrorCode, type FieldErrors } from './types'

/** Reads a submitted field as a string ('' when missing or not text). */
export type Read = (name: string) => string

export const fromFormData =
  (formData: FormData): Read =>
  (name) => {
    const value = formData.get(name)
    return typeof value === 'string' ? value : ''
  }

// Control characters and invisible direction overrides (which could disguise text in the admin).
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g

const line = (value: string) =>
  value.normalize('NFC').replace(CONTROL, '').replace(/\s+/g, ' ').trim()
const block = (value: string) =>
  value
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const checked = (read: Read, name: string) => read(name) === 'on'

type Rule = { max: number; email?: boolean; optional?: boolean; multiline?: boolean }

function collect(read: Read, rules: Record<string, Rule>, errors: FieldErrors) {
  const values: Record<string, string> = {}
  for (const [name, rule] of Object.entries(rules)) {
    const value = rule.multiline ? block(read(name)) : line(read(name))
    values[name] = value
    let error: ErrorCode | undefined
    if (!value) error = rule.optional ? undefined : 'required'
    else if (value.length > rule.max) error = 'tooLong'
    else if (rule.email && !EMAIL.test(value)) error = 'email'
    if (error) errors[name] = error
  }
  return values
}

function requireChecked(read: Read, names: string[], errors: FieldErrors) {
  const values: Record<string, string> = {}
  for (const name of names) {
    values[name] = checked(read, name) ? 'on' : ''
    if (!values[name]) errors[name] = 'accept'
  }
  return values
}

function choice<T extends string>(
  read: Read,
  name: string,
  options: readonly T[],
  errors: FieldErrors,
): T | '' {
  const value = read(name)
  if ((options as readonly string[]).includes(value)) return value as T
  errors[name] = value ? 'choice' : 'required'
  return ''
}

/** `values` is what was entered (cleaned), for showing the form again. */
type Result<T> =
  | { ok: true; data: T; values: Record<string, string> }
  | { ok: false; errors: FieldErrors; values: Record<string, string> }

export type MembershipData = {
  firstName: string
  lastName: string
  email: string
  address: { street: string; postalCode: string; city: string; country: string }
  membershipType: (typeof MEMBERSHIP_TYPES)[number]
  declarations: { atLeast16: true; principles: true; fees: true }
  under18: boolean
  guardian?: { name: string; email: string }
}

/**
 * Only what the Satzung requires (plan §6). The guardian's details are required for applicants
 * under 18 and are dropped otherwise, even if they were typed in before.
 */
export function validateMembership(read: Read): Result<MembershipData> {
  const errors: FieldErrors = {}
  const text = collect(
    read,
    {
      firstName: { max: 100 },
      lastName: { max: 100 },
      email: { max: 254, email: true },
      street: { max: 150 },
      postalCode: { max: 12 },
      city: { max: 100 },
      country: { max: 100 },
    },
    errors,
  )
  const membershipType = choice(read, 'membershipType', MEMBERSHIP_TYPES, errors)
  const under18 = checked(read, 'under18')
  const guardian: Record<string, string> = under18
    ? collect(
        read,
        { guardianName: { max: 200 }, guardianEmail: { max: 254, email: true } },
        errors,
      )
    : {}
  const declarations = requireChecked(read, ['atLeast16', 'principles', 'fees', 'consent'], errors)

  const values = {
    ...text,
    ...guardian,
    ...declarations,
    membershipType,
    under18: under18 ? 'on' : '',
  }
  if (Object.keys(errors).length || !membershipType) return { ok: false, errors, values }
  return {
    ok: true,
    values,
    data: {
      firstName: text.firstName!,
      lastName: text.lastName!,
      email: text.email!,
      address: {
        street: text.street!,
        postalCode: text.postalCode!,
        city: text.city!,
        country: text.country!,
      },
      membershipType,
      declarations: { atLeast16: true, principles: true, fees: true },
      under18,
      ...(under18
        ? { guardian: { name: guardian.guardianName!, email: guardian.guardianEmail! } }
        : {}),
    },
  }
}

export type ContactData = {
  name: string
  email: string
  topic: (typeof CONTACT_TOPICS)[number]
  message: string
}

export function validateContact(read: Read): Result<ContactData> {
  const errors: FieldErrors = {}
  const text = collect(
    read,
    {
      name: { max: 200 },
      email: { max: 254, email: true },
      message: { max: 5000, multiline: true },
    },
    errors,
  )
  const topic = choice(read, 'topic', CONTACT_TOPICS, errors)
  const consent = requireChecked(read, ['consent'], errors)
  const values = { ...text, ...consent, topic }
  if (Object.keys(errors).length || !topic) return { ok: false, errors, values }
  return {
    ok: true,
    values,
    data: { name: text.name!, email: text.email!, topic, message: text.message! },
  }
}
