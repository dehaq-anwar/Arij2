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

export const kindLabel = (t: Texts, kind: string) =>
  (t[`n_${kind}` as keyof Texts] as string | undefined) ?? kind

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
