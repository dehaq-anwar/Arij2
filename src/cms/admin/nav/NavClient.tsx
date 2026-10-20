'use client'

import { Link, Logout, useNav } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import logoLight from '../../../assets/logo/yop-logo-light.png'
import { Icon, type IconName } from '../icons'

export type NavItemData = {
  id: string
  href: string
  label: string
  icon: IconName
  badge?: number
  exact?: boolean
}
export type NavGroupData = { key: string; label: string; items: NavItemData[] }

type Props = {
  groups: NavGroupData[]
  person: { name: string; role: string }
  texts: { controlCenter: string; closeNavigation: string; association: string }
}

/**
 * Keeps Payload's nav structure and class names (`nav`, `nav--nav-open`, `nav__scroll`…), so
 * its layout, the mobile toggle in the header and the remembered open/closed state keep
 * working; admin.css gives it the Control Center's look.
 */
export function NavClient({ groups, person, texts }: Props) {
  const pathname = usePathname()
  const { hydrated, navOpen, navRef, setNavOpen, shouldAnimate } = useNav()
  // On a desktop the sidebar always shows (admin.css); Payload's open/closed state then only
  // matters below 1025 px, where the navigation is a menu.
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1025px)')
    const update = () => setDesktop(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  const open = desktop || navOpen
  const menu = !desktop && navOpen

  // As a menu (below 1025 px) the navigation closes with Escape, like a dialog.
  useEffect(() => {
    if (!menu) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menu, setNavOpen])

  const isActive = (item: NavItemData) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`)

  const className = [
    'nav',
    'yop-nav',
    open && 'nav--nav-open',
    shouldAnimate && 'nav--nav-animate',
    hydrated && 'nav--nav-hydrated',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      {menu ? (
        // Tapping next to the open menu closes it (the close button inside is the keyboard way).
        <button
          type="button"
          className="yop-nav__backdrop"
          aria-label={texts.closeNavigation}
          tabIndex={-1}
          onClick={() => setNavOpen(false)}
        />
      ) : null}
      <aside className={className} inert={!open ? true : undefined}>
        <div className="nav__scroll" ref={navRef}>
          <div className="yop-nav__brand">
            <span className="yop-brand-mark">
              {/* eslint-disable-next-line @next/next/no-img-element -- static asset, admin only */}
              <img src={logoLight.src} alt="" />
            </span>
            <span className="yop-nav__brand-text">
              <strong>Youth of Peace</strong>
              <span>{texts.controlCenter}</span>
            </span>
            <button
              type="button"
              className="yop-nav__close"
              aria-label={texts.closeNavigation}
              onClick={() => setNavOpen(false)}
            >
              <Icon name="close" />
            </button>
          </div>
          <nav className="nav__wrap yop-nav__groups" aria-label={texts.controlCenter}>
            {groups.map((group) => (
              <div key={group.key} className="yop-nav__group">
                <h2 className="yop-nav__heading">{group.label}</h2>
                <ul>
                  {group.items.map((item) => {
                    const active = isActive(item)
                    return (
                      <li key={item.id}>
                        <Link
                          id={item.id}
                          href={item.href}
                          prefetch={false}
                          className={`yop-nav__link${active ? ' yop-nav__link--active' : ''}`}
                          aria-current={active ? 'page' : undefined}
                        >
                          <Icon name={item.icon} />
                          <span className="yop-nav__label">{item.label}</span>
                          {item.badge ? <span className="yop-nav__badge">{item.badge}</span> : null}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <div className="yop-nav__foot">
            <Link href="/admin/account" prefetch={false} className="yop-nav__person">
              <span className="yop-avatar" aria-hidden="true">
                {person.name
                  .split(/\s+/)
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <span className="yop-nav__person-text">
                <strong>{person.name}</strong>
                <span>{person.role}</span>
              </span>
            </Link>
            <Logout />
          </div>
        </div>
      </aside>
    </>
  )
}
