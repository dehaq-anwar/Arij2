'use client'

import { useTranslations } from 'next-intl'

import type { FormState } from '@/lib/forms/types'

/**
 * Turns a form response into what the fields need: the entered values, a translated message
 * per field, and the items of the error summary (in on-screen order, linked to the fields).
 */
export function useFormFeedback<F extends string>(
  state: FormState,
  fields: readonly F[],
  labels: Record<F, string>,
  targetId: (field: F) => string,
) {
  const f = useTranslations('Forms')
  if (state.status !== 'error') {
    return { values: {} as Record<string, string>, error: () => undefined, summary: null }
  }
  const error = (name: F) => {
    const code = state.errors[name]
    return code ? f(code) : undefined
  }
  const items = fields
    .filter((name) => state.errors[name])
    .map((name) => ({
      href: `#${targetId(name)}`,
      text: `${labels[name].replace(/[.。]\s*$/, '')}: ${error(name)}`,
    }))
  return {
    values: state.values,
    error,
    summary: {
      heading: f('errorHeading'),
      items,
      notice: state.notice ? f(state.notice) : undefined,
    },
  }
}
