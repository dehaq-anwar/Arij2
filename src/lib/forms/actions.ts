'use server'

import { hasLocale } from 'next-intl'
import { headers } from 'next/headers'
import { after } from 'next/server'

import { routing, type Locale } from '@/i18n/routing'
import { getPayloadClient } from '@/lib/cms/payload'
import { getGlobal } from '@/lib/cms/queries'

import { notifyNewSubmission } from './notify'
import { allowAttempt, clientAddress, LIMITS } from './rate-limit'
import { checkFormToken, issueFormToken, type FormName } from './token'
import { HONEYPOT, type FormState } from './types'
import {
  fromFormData,
  validateContact,
  validateMembership,
  type ContactData,
  type MembershipData,
  type Read,
} from './validation'

const success: FormState = { status: 'success' }

type Collection = 'membership-applications' | 'contact-messages'

/**
 * The common path of both forms. Order matters:
 * 1. honeypot filled → pretend success (bots learn nothing);
 * 2. invalid input → errors (not counted, people make mistakes);
 * 3. rate limit per hashed address → honest message;
 * 4. signed timestamp missing, forged or too fast → pretend success; expired → reload message;
 * 5. save with the consent record, then notify without personal data.
 * Nothing personal is logged on any path.
 */
async function submit<T extends object>(
  form: FormName,
  collection: Collection,
  formData: FormData,
  validate: (read: Read) => ReturnType<typeof validateMembership | typeof validateContact>,
  consentText: (locale: Locale) => Promise<string>,
): Promise<FormState> {
  const read = fromFormData(formData)
  if (read(HONEYPOT)) return success

  const result = validate(read)
  if (!result.ok) return { status: 'error', errors: result.errors, values: result.values }
  const { values } = result

  const payload = await getPayloadClient()
  const address = clientAddress(await headers())
  if (!(await allowAttempt(payload, form, address, LIMITS.form))) {
    return { status: 'error', errors: {}, values, notice: 'rateLimited' }
  }

  const token = checkFormToken(form, read('token'))
  if (token === 'invalid' || token === 'too-fast') return success
  if (token === 'expired') {
    return { status: 'error', errors: {}, values, notice: 'expired', token: issueFormToken(form) }
  }

  const requested = read('locale')
  const locale: Locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale
  try {
    const [text, privacy] = await Promise.all([
      consentText(locale),
      getGlobal('privacy-policy', locale),
    ])
    const doc = await payload.create({
      collection,
      overrideAccess: true,
      depth: 0,
      data: {
        ...(result.data as T),
        locale,
        consent: {
          given: true,
          at: new Date().toISOString(),
          privacyPolicyVersion: privacy.version ?? '',
          text,
        },
      } as never,
    })
    after(() => notifyNewSubmission(payload, collection, doc.id))
    return success
  } catch (error) {
    // Database errors can quote the submitted values, so only the error code is logged.
    payload.logger.error({ code: (error as { code?: string }).code }, `Could not save ${form} form`)
    return { status: 'error', errors: {}, values, notice: 'server' }
  }
}

export async function submitMembership(_previous: FormState, formData: FormData) {
  return submit<MembershipData>(
    'membership',
    'membership-applications',
    formData,
    validateMembership,
    async (locale) => (await getGlobal('membership-page', locale)).form?.consent ?? '',
  )
}

export async function submitContact(_previous: FormState, formData: FormData) {
  return submit<ContactData>(
    'contact',
    'contact-messages',
    formData,
    validateContact,
    async (locale) => (await getGlobal('contact-page', locale)).form?.consent ?? '',
  )
}
