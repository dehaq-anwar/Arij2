'use client'

import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useLenis } from '@/components/motion/SmoothScroll'
import { ButtonLink, buttonClass } from '@/components/ui/ButtonLink'
import type { Href, MenuEntry } from '@/lib/links'
import { gsap } from '@/lib/motion/gsap'
import { MOTION_OK } from '@/lib/motion/media'

import { MainNav } from './MainNav'

/**
 * Menu for small screens, built on the native modal <dialog>: the browser traps focus,
 * closes it on Esc and makes the page behind it inert. A full-screen night panel whose links
 * arrive one after another (static with reduced motion). Smooth scrolling pauses while it is
 * open, it closes when a link is followed, and focus returns to the menu button.
 */
export function MobileMenu({
  className = '',
  items,
  cta,
}: {
  className?: string
  items: MenuEntry[]
  cta: MenuEntry
}) {
  const t = useTranslations('Header')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const navigatingRef = useRef(false)
  const [open, setOpen] = useState(false)
  const lenis = useLenis()
  const pathname = usePathname()

  const show = () => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
    setOpen(true)
    lenis?.current?.stop()
    document.documentElement.classList.add('menu-open')
    if (window.matchMedia(MOTION_OK).matches) {
      gsap.fromTo(
        dialog.querySelectorAll('[data-menu-item]'),
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'expo.out', delay: 0.05 },
      )
    }
  }

  const hide = useCallback(() => dialogRef.current?.close(), [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onClose = () => {
      setOpen(false)
      lenis?.current?.start()
      document.documentElement.classList.remove('menu-open')
      gsap.killTweensOf(dialog.querySelectorAll('[data-menu-item]'))
      // After following a link the new page takes over; otherwise return focus to the button.
      if (!navigatingRef.current) buttonRef.current?.focus()
      navigatingRef.current = false
    }
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('a')) {
        navigatingRef.current = true
        hide()
      }
    }
    dialog.addEventListener('close', onClose)
    dialog.addEventListener('click', onClick)
    return () => {
      dialog.removeEventListener('close', onClose)
      dialog.removeEventListener('click', onClick)
    }
  }, [hide, lenis])

  // Also close when the route changes by other means (e.g. browser back).
  useEffect(() => {
    hide()
  }, [pathname, hide])

  const icon = (d: string) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d={d} />
    </svg>
  )

  return (
    <div className={className}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={show}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-current/30 px-4 py-2 text-[0.95rem] font-medium text-current max-[22.5rem]:px-2.5"
      >
        {icon('M4 8h16M4 16h16')}
        {/* Very narrow screens (or 400 % zoom): the icon alone, so the button stays in view. */}
        <span className="max-[22.5rem]:sr-only">{t('menu')}</span>
      </button>

      <dialog
        ref={dialogRef}
        id="mobile-menu"
        aria-label={t('menu')}
        data-lenis-prevent
        data-surface="night"
        className="m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-night p-0 text-on-night open:flex open:flex-col backdrop:bg-night"
      >
        <div aria-hidden="true" className="aurora">
          <span
            style={{
              width: '80vmax',
              height: '80vmax',
              insetBlockStart: '35%',
              insetInlineStart: '-30%',
              background: 'var(--color-brand)',
              opacity: 0.4,
            }}
          />
          <span
            style={{
              width: '60vmax',
              height: '60vmax',
              insetBlockStart: '-25%',
              insetInlineStart: '45%',
              background: '#1f6fa8',
              opacity: 0.45,
            }}
          />
          <i />
        </div>
        <div className="flex items-center justify-end px-4 pt-11 pb-3 sm:px-6">
          <button
            type="button"
            onClick={hide}
            className="glass inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 font-medium text-on-night"
          >
            {icon('M6 6l12 12M18 6L6 18')}
            {t('closeMenu')}
          </button>
        </div>
        <div className="flex flex-1 flex-col justify-between overflow-y-auto px-6 pt-6 pb-10">
          <MainNav items={items} orientation="vertical" />
          <div data-menu-item="" className="mt-10">
            {cta.external ? (
              <a href={cta.href as string} className={buttonClass('light', 'w-full')}>
                {cta.label}
              </a>
            ) : (
              <ButtonLink href={cta.href as Href} variant="light" arrow className="w-full">
                {cta.label}
              </ButtonLink>
            )}
          </div>
        </div>
      </dialog>
    </div>
  )
}
