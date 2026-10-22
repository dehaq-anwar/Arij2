import type { CollectionConfig, Payload } from 'payload'

import { allow, nobody } from '../access/roles'
import { label } from '../lib/labels'
import { TEMPLATES } from './templates'

/** Proposal (docs/CONTROL-CENTER.md §6): delivery entries are kept 90 days. */
export const EMAIL_LOG_DAYS = 90

export const DELIVERY_STATUSES = ['sent', 'failed', 'notConfigured'] as const
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]

/** `info@yop-ye.org` → `i***@yop-ye.org`; several addresses each. */
export function maskRecipients(value: unknown): string {
  const list = Array.isArray(value) ? value : [value]
  return list
    .map((item) => {
      const address =
        typeof item === 'string' ? item : ((item as { address?: string } | null)?.address ?? '')
      const match = /<([^>]+)>/.exec(address)
      const plain = (match?.[1] ?? address).trim()
      const at = plain.lastIndexOf('@')
      if (at < 1) return '***'
      return `${plain[0]}***${plain.slice(at)}`
    })
    .filter(Boolean)
    .join(', ')
    .slice(0, 300)
}

/**
 * Delivery log (docs/CONTROL-CENTER.md §6): when, which template, to whom (shortened), with
 * which result and error code. No subject lines, no message bodies. Written by the e-mail
 * adapter (src/cms/email.ts) for every e-mail; nobody can change entries.
 */
export const EmailLog: CollectionConfig = {
  slug: 'email-log',
  labels: {
    singular: label('Versandeintrag', 'Delivery entry', 'سجل إرسال'),
    plural: label('Versandprotokoll', 'Delivery log', 'سجل الإرسال'),
  },
  admin: { hidden: true },
  access: { read: allow('email.manage'), create: nobody, update: nobody, delete: nobody },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'template',
      type: 'select',
      required: true,
      index: true,
      options: [...TEMPLATES, 'other'].map((value) => ({ value, label: value })),
    },
    { name: 'recipient', type: 'text', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      index: true,
      options: DELIVERY_STATUSES.map((value) => ({ value, label: value })),
    },
    { name: 'errorCode', type: 'text' },
    { name: 'durationMs', type: 'number' },
  ],
}

export async function recordDelivery(
  payload: Payload,
  entry: {
    template: string
    to: unknown
    status: DeliveryStatus
    errorCode?: string | null
    durationMs?: number | null
  },
) {
  try {
    return await payload.create({
      collection: 'email-log',
      data: {
        template: ([...TEMPLATES, 'other'] as string[]).includes(entry.template)
          ? (entry.template as (typeof TEMPLATES)[number])
          : 'other',
        recipient: maskRecipients(entry.to),
        status: entry.status,
        errorCode: entry.errorCode ?? null,
        durationMs: entry.durationMs ?? null,
      },
      overrideAccess: true,
      depth: 0,
    })
  } catch (error) {
    payload.logger.warn({ err: error }, 'Could not record an e-mail delivery')
    return null
  }
}
