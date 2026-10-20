'use client'

import { useAuth } from '@payloadcms/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { fill, useAdminText } from '../client'
import { formatDateTime } from '../i18n'
import { Icon } from '../icons'
import {
  fetchFeed,
  kindLabel,
  markRead,
  safeHref,
  subjectLabel,
  type NotificationItem,
} from './shared'

/**
 * The bell in the Control Center's header: number of unread notifications and the latest ones
 * in a panel (a disclosure: button + region, closes with Escape or a click outside). Refreshed
 * every minute and when the window regains focus.
 */
export function Bell() {
  const { t, lang } = useAdminText()
  const { user } = useAuth()
  const router = useRouter()
  const panelId = useId()
  const wrapper = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [feed, setFeed] = useState<{ unread: number; items: NotificationItem[] } | null>(null)

  const load = useCallback(() => {
    void fetchFeed(8).then((data) => data && setFeed(data))
  }, [])

  useEffect(() => {
    if (!user) return
    load()
    const timer = setInterval(load, 60_000)
    window.addEventListener('focus', load)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', load)
    }
  }, [load, user])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    const onClick = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [open])

  if (!user) return null
  const unread = feed?.unread ?? 0

  async function follow(item: NotificationItem) {
    setOpen(false)
    if (!item.read) await markRead({ ids: [item.id] })
    load()
    router.push(safeHref(item.href))
  }

  return (
    <div className="yop-bell" ref={wrapper}>
      <button
        ref={button}
        type="button"
        className="yop-bell__button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={fill(t.bellLabel, { count: unread })}
        onClick={() => {
          setOpen((value) => !value)
          if (!open) load()
        }}
      >
        <Icon name="bell" />
        {unread > 0 && (
          <span className="yop-bell__badge" aria-hidden="true">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      <div
        id={panelId}
        className="yop-bell__panel"
        role="region"
        aria-label={t.notifications}
        hidden={!open}
      >
        <div className="yop-bell__head">
          <strong>{t.notifications}</strong>
          {unread > 0 && (
            <button
              type="button"
              className="yop-link-button"
              onClick={() => void markRead({ all: true }).then(load)}
            >
              {t.markAllRead}
            </button>
          )}
        </div>
        {feed?.items.length ? (
          <ul className="yop-bell__list">
            {feed.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`yop-bell__item${item.read ? '' : ' yop-bell__item--unread'}`}
                  onClick={() => void follow(item)}
                >
                  <span className="yop-bell__title">
                    {!item.read && <span className="yop-visually-hidden">{t.unread}: </span>}
                    {kindLabel(t, item.kind)}
                  </span>
                  <span className="yop-list__meta">
                    {subjectLabel(t, item)} · <bdi>{formatDateTime(item.createdAt, lang)}</bdi>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="yop-empty">{t.noNotifications}</p>
        )}
        <Link
          className="yop-bell__all"
          href="/admin/notifications"
          prefetch={false}
          onClick={() => setOpen(false)}
        >
          {t.showAllNotifications}
        </Link>
      </div>
    </div>
  )
}
