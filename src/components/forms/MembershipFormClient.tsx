'use client'

import { useTranslations } from 'next-intl'
import { useActionState, type ReactNode } from 'react'

import { submitMembership } from '@/lib/forms/actions'
import { idle, MEMBERSHIP_TYPES } from '@/lib/forms/types'

import {
  CheckboxField,
  ErrorSummary,
  Honeypot,
  RadioCards,
  SubmitButton,
  SuccessPanel,
  TextField,
} from './fields'
import { useFormFeedback } from './feedback'

export type MembershipTexts = {
  principles: ReactNode
  fees: ReactNode
  guardian: ReactNode
  consent: ReactNode
  privacyLink: ReactNode
}

const ID = 'membership'
const id = (name: string) => `${ID}-${name}`

/** Field order for the error summary (same as on screen). */
const FIELDS = [
  'firstName',
  'lastName',
  'email',
  'street',
  'postalCode',
  'city',
  'country',
  'membershipType',
  'atLeast16',
  'guardianName',
  'guardianEmail',
  'principles',
  'fees',
  'consent',
] as const

const legend = 'text-lg font-semibold'
const group = 'mt-10 border-t border-line pt-8'

export function MembershipFormClient({
  locale,
  token,
  permalink,
  texts,
}: {
  locale: string
  token: string
  /** Where the form posts before JavaScript has loaded (progressive enhancement). */
  permalink: string
  texts: MembershipTexts
}) {
  const t = useTranslations('MembershipForm')
  const f = useTranslations('Forms')
  const [state, action] = useActionState(submitMembership, idle, permalink)
  const labels: Record<(typeof FIELDS)[number], string> = {
    firstName: t('firstName'),
    lastName: t('lastName'),
    email: t('email'),
    street: t('street'),
    postalCode: t('postalCode'),
    city: t('city'),
    country: t('country'),
    membershipType: t('typeHeading'),
    atLeast16: t('atLeast16'),
    guardianName: t('guardianName'),
    guardianEmail: t('guardianEmail'),
    principles: t('principlesShort'),
    fees: t('feesShort'),
    consent: f('consentShort'),
  }
  const { values, error, summary } = useFormFeedback(state, FIELDS, labels, (name) =>
    name === 'membershipType' ? id('membershipType-ordinary') : id(name),
  )

  return (
    <div>
      <div role="status">
        {state.status === 'success' ? (
          <SuccessPanel heading={f('successHeading')} text={t('success')} />
        ) : null}
      </div>
      {state.status === 'success' ? null : (
        <form action={action} noValidate>
          <p className="mb-8 text-sm text-ink-muted">{f('allRequired')}</p>
          {summary ? <ErrorSummary id={id('errors')} stamp={state} {...summary} /> : null}

          <fieldset>
            <legend className={legend}>{t('personHeading')}</legend>
            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              <TextField
                id={id('firstName')}
                name="firstName"
                label={t('firstName')}
                autoComplete="given-name"
                maxLength={100}
                defaultValue={values.firstName}
                error={error('firstName')}
              />
              <TextField
                id={id('lastName')}
                name="lastName"
                label={t('lastName')}
                autoComplete="family-name"
                maxLength={100}
                defaultValue={values.lastName}
                error={error('lastName')}
              />
              <TextField
                id={id('email')}
                name="email"
                type="email"
                label={t('email')}
                autoComplete="email"
                maxLength={254}
                defaultValue={values.email}
                error={error('email')}
                className="sm:col-span-2"
              />
            </div>
          </fieldset>

          <div className={group}>
            <fieldset aria-describedby={id('address-hint')}>
              <legend className={legend}>{t('addressHeading')}</legend>
              <p id={id('address-hint')} className="mt-1 text-sm text-ink-muted">
                {t('addressHint')}
              </p>
              <div className="mt-5 grid gap-6 sm:grid-cols-3">
                <TextField
                  id={id('street')}
                  name="street"
                  label={t('street')}
                  autoComplete="street-address"
                  maxLength={150}
                  defaultValue={values.street}
                  error={error('street')}
                  className="sm:col-span-3"
                />
                <TextField
                  id={id('postalCode')}
                  name="postalCode"
                  label={t('postalCode')}
                  autoComplete="postal-code"
                  maxLength={12}
                  defaultValue={values.postalCode}
                  error={error('postalCode')}
                />
                <TextField
                  id={id('city')}
                  name="city"
                  label={t('city')}
                  autoComplete="address-level2"
                  maxLength={100}
                  defaultValue={values.city}
                  error={error('city')}
                  className="sm:col-span-2"
                />
                <TextField
                  id={id('country')}
                  name="country"
                  label={t('country')}
                  autoComplete="country-name"
                  maxLength={100}
                  defaultValue={values.country}
                  error={error('country')}
                  className="sm:col-span-3"
                />
              </div>
            </fieldset>
          </div>

          <div className={group}>
            <RadioCards
              id={id('membershipType')}
              name="membershipType"
              legend={<span className={legend}>{t('typeHeading')}</span>}
              options={MEMBERSHIP_TYPES.map((value) => ({ value, label: t(value) }))}
              defaultValue={values.membershipType}
              error={error('membershipType')}
            />
          </div>

          <div className={group}>
            <fieldset>
              <legend className={legend}>{t('ageHeading')}</legend>
              <div className="mt-4 space-y-2">
                <CheckboxField
                  id={id('atLeast16')}
                  name="atLeast16"
                  label={t('atLeast16')}
                  defaultChecked={values.atLeast16 === 'on'}
                  error={error('atLeast16')}
                />
                <CheckboxField
                  id={id('under18')}
                  name="under18"
                  label={t('under18')}
                  required={false}
                  defaultChecked={values.under18 === 'on'}
                >
                  <span className="text-ink-muted">{texts.guardian}</span>
                </CheckboxField>
              </div>
              <div className="guardian-fields mt-5 gap-6 rounded-2xl bg-surface-sky p-5 sm:grid-cols-2">
                <TextField
                  id={id('guardianName')}
                  name="guardianName"
                  label={t('guardianName')}
                  maxLength={200}
                  defaultValue={values.guardianName}
                  error={error('guardianName')}
                />
                <TextField
                  id={id('guardianEmail')}
                  name="guardianEmail"
                  type="email"
                  label={t('guardianEmail')}
                  maxLength={254}
                  defaultValue={values.guardianEmail}
                  error={error('guardianEmail')}
                />
              </div>
            </fieldset>
          </div>

          <div className={group}>
            <fieldset>
              <legend className={legend}>{t('declarationsHeading')}</legend>
              <div className="mt-4 space-y-3">
                <CheckboxField
                  id={id('principles')}
                  name="principles"
                  label={texts.principles}
                  defaultChecked={values.principles === 'on'}
                  error={error('principles')}
                />
                <CheckboxField
                  id={id('fees')}
                  name="fees"
                  label={texts.fees}
                  defaultChecked={values.fees === 'on'}
                  error={error('fees')}
                />
                <CheckboxField
                  id={id('consent')}
                  name="consent"
                  label={texts.consent}
                  defaultChecked={values.consent === 'on'}
                  error={error('consent')}
                >
                  {texts.privacyLink}
                </CheckboxField>
              </div>
            </fieldset>
          </div>

          <Honeypot label={f('honeypot')} />
          <input
            type="hidden"
            name="token"
            value={state.status === 'error' && state.token ? state.token : token}
          />
          <input type="hidden" name="locale" value={locale} />
          <div className="mt-10">
            <SubmitButton pendingLabel={f('sending')}>{t('submit')}</SubmitButton>
          </div>
        </form>
      )}
    </div>
  )
}
