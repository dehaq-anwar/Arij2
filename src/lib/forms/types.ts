/** Shared between the server actions and the form components (no server-only imports). */

export const MEMBERSHIP_TYPES = ['ordinary', 'supporting'] as const

export const CONTACT_TOPICS = [
  'general',
  'membership',
  'volunteering',
  'partnership',
  'press',
  'other',
] as const

export type ErrorCode = 'required' | 'email' | 'tooLong' | 'accept' | 'choice'
export type FieldErrors = Record<string, ErrorCode>

/** Problems that concern the whole form rather than one field. */
export type FormNotice = 'rateLimited' | 'expired' | 'server'

export type FormState =
  | { status: 'idle' }
  | { status: 'success' }
  | {
      status: 'error'
      errors: FieldErrors
      /** What was entered, so the form can be shown again (also without JavaScript). */
      values: Record<string, string>
      notice?: FormNotice
      /** A fresh token when the old one expired. */
      token?: string
    }

export const idle: FormState = { status: 'idle' }

/** Name of the hidden field that people never see and bots tend to fill in. */
export const HONEYPOT = 'website'
