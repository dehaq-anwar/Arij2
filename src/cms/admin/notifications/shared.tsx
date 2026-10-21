'use client'

import { fill, type adminTexts } from '../i18n'

type Texts = (typeof adminTexts)['de']

export type NotificationItem = {
  id: number
  kind: string
  subjectType: string
  subjectId: string | null
  href: string
  createdAt: string
  read: boolean
}

/** The text of a notice; some kinds have their own text per type of record. */
export const kindLabel = (t: Texts, item: Pick<NotificationItem, 'kind' | 'subjectType'>) =>
  (t[`n_${item.kind}_${item.subjectType}` as keyof Texts] as string | undefined) ??
  (t[`n_${item.kind}` as keyof Texts] as string | undefined) ??
  item.kind

export const subjectLabel = (t: Texts, item: NotificationItem) => {
  const template = t[`subject_${item.subjectType}` as keyof Texts] as string | undefined
  return template ? fill(template, { id: item.subjectId ?? '' }) : ''
}

/** Only links inside the Control Center are followed. */
export const safeHref = (href: string) => (href.startsWith('/admin') ? href : '/admin')

export async function fetchFeed(limit: number) {
  const response = await fetch(`/api/notifications/feed?limit=${limit}`, {
    credentials: 'include',
    cache: 'no-store',
  })
  if (!response.ok) return null
  return (await response.json()) as { unread: number; items: NotificationItem[] }
}

export async function markRead(body: { ids?: number[]; all?: boolean }) {
  await fetch('/api/notifications/read', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
