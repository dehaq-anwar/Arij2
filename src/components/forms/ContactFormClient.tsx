'use client'

import { useTranslations } from 'next-intl'
import { useActionState, type ReactNode } from 'react'

import { submitContact } from '@/lib/forms/actions'
import { CONTACT_TOPICS, idle } from '@/lib/forms/types'

import { useFormFeedback } from './feedback'
import {
  CheckboxField,
  ErrorSummary,
  Honeypot,
  SelectField,
  SubmitButton,
  SuccessPanel,
  TextField,
} from './fields'

export type ContactTexts = { consent: ReactNode; privacyLink: ReactNode }

const ID = 'contact'
const id = (name: string) => `${ID}-${name}`
const FIELDS = ['name', 'email', 'topic', 'message', 'consent'] as const

export function ContactFormClient({
  locale,
  token,
  permalink,
  texts,
}: {
  locale: string
  token: string
  permalink: string
  texts: ContactTexts
}) {
  const t = useTranslations('ContactForm')
  const f = useTranslations('Forms')
  const [state, action] = useActionState(submitContact, idle, permalink)
  const { values, error, summary } = useFormFeedback(
    state,
    FIELDS,
    {
      name: t('name'),
      email: t('email'),
      topic: t('topic'),
      message: t('message'),
      consent: f('consentShort'),
    },
    id,
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
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              id={id('name')}
              name="name"
              label={t('name')}
              autoComplete="name"
              maxLength={200}
              defaultValue={values.name}
              error={error('name')}
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
            />
            <div className="sm:col-span-2">
              <SelectField
                id={id('topic')}
                name="topic"
                label={t('topic')}
                options={CONTACT_TOPICS.map((value) => ({ value, label: t(`topics.${value}`) }))}
                defaultValue={values.topic || 'general'}
                error={error('topic')}
              />
            </div>
            <TextField
              id={id('message')}
              name="message"
              label={t('message')}
              hint={t('messageHint')}
              multiline
              maxLength={5000}
              defaultValue={values.message}
              error={error('message')}
              className="sm:col-span-2"
            />
            <div className="sm:col-span-2">
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
