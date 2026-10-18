'use client'

import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { useLenis } from '@/components/motion/SmoothScroll'

/**
 * Menu for small screens, built on the native modal <dialog>: the browser traps focus,
 * closes it on Esc and makes the page behind it inert. Smooth scrolling pauses while it is
 * open, it closes when a link is followed, and focus returns to the menu button.
 */
export function MobileMenu({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
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
  }

  const hide = useCallback(() => dialogRef.current?.close(), [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onClose = () => {
      setOpen(false)
      lenis?.current?.start()
      document.documentElement.classList.remove('menu-open')
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

  return (
    <div className={className}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={show}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line-strong px-3 py-2 font-medium text-ink hover:bg-surface"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        {t('menu')}
      </button>

      <dialog
        ref={dialogRef}
        id="mobile-menu"
        aria-label={t('menu')}
        data-lenis-prevent
        className="m-0 h-dvh max-h-none w-full max-w-none bg-canvas p-0 text-ink open:flex open:flex-col"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-lg font-bold">{t('menu')}</span>
          <button
            type="button"
            onClick={hide}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line-strong px-3 py-2 font-medium text-ink hover:bg-surface"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
            {t('closeMenu')}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-6">{children}</div>
      </dialog>
    </div>
  )
}
