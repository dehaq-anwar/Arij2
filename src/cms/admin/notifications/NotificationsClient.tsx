'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

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

export function NotificationsClient() {
  const { t, lang } = useAdminText()
  const router = useRouter()
  const [feed, setFeed] = useState<{ unread: number; items: NotificationItem[] } | null>(null)
  const load = useCallback(() => {
    void fetchFeed(50).then(setFeed)
  }, [])
  useEffect(() => load(), [load])

  return (
    <div className="yop-page">
      <div className="yop-page__head">
        <div>
          <h1 className="yop-page__title">
            <span className="yop-page__icon">
              <Icon name="bell" />
            </span>
            {t.notifications}
          </h1>
          <p className="yop-lead">{t.notificationsLead}</p>
        </div>
        {feed && feed.unread > 0 && (
          <div className="yop-page__actions">
            <button
              type="button"
              className="yop-button"
              onClick={() => void markRead({ all: true }).then(load)}
            >
              <Icon name="check" />
              {t.markAllRead}
            </button>
          </div>
        )}
      </div>
      <section className="yop-card" aria-labelledby="yop-notifications-title">
        <div className="yop-card__head">
          <h2 id="yop-notifications-title">{t.notifications}</h2>
          {feed && (
            <span className="yop-card__sub">{fill(t.unreadCount, { count: feed.unread })}</span>
          )}
        </div>
        {feed == null ? null : feed.items.length ? (
          <ul className="yop-list yop-notifications">
            {feed.items.map((item) => (
              <li key={item.id} className={item.read ? undefined : 'yop-notifications__unread'}>
                <button
                  type="button"
                  className="yop-notifications__item"
                  onClick={() =>
                    void (item.read ? Promise.resolve() : markRead({ ids: [item.id] })).then(() =>
                      router.push(safeHref(item.href)),
                    )
                  }
                >
                  <span className="yop-list__title">
                    {!item.read && <span className="yop-visually-hidden">{t.unread}: </span>}
                    {kindLabel(t, item)}
                  </span>
                  <span className="yop-list__meta">
                    {subjectLabel(t, item)} · <bdi>{formatDateTime(item.createdAt, lang)}</bdi>
                  </span>
                </button>
                {!item.read && <span className="yop-pill yop-pill--info">{t.unread}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="yop-empty">{t.noNotifications}</p>
        )}
      </section>
    </div>
  )
}
