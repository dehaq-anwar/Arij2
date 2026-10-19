'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'

/**
 * The fixed header follows the section beneath it: light text over night sections
 * (data-surface="night"), dark text on frosted glass over day sections. Every page starts with
 * a night section, so the server renders tone="night" and nothing flips on load.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    const header = ref.current
    if (!header) return
    let frame = 0
    const update = () => {
      frame = 0
      const probe = header.offsetHeight - 1
      const night = Array.from(document.querySelectorAll('[data-surface="night"]')).some(
        (section) => {
          if (header.contains(section)) return false
          const { top, bottom } = section.getBoundingClientRect()
          return top <= probe && bottom > probe
        },
      )
      header.dataset.tone = night ? 'night' : 'day'
      header.toggleAttribute('data-scrolled', window.scrollY > 8)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [pathname])

  return (
    <header
      ref={ref}
      data-tone="night"
      className="group/header fixed inset-x-0 top-0 z-40 text-on-night transition-[background-color,color,box-shadow,backdrop-filter] duration-500 data-[tone=day]:text-ink data-[scrolled]:data-[tone=day]:bg-canvas/80 data-[scrolled]:data-[tone=day]:shadow-[0_1px_0_var(--color-line),0_12px_30px_-24px_rgba(4,50,78,0.5)] data-[scrolled]:data-[tone=day]:backdrop-blur-xl data-[scrolled]:data-[tone=night]:bg-night/60 data-[scrolled]:data-[tone=night]:backdrop-blur-xl"
    >
      {children}
    </header>
  )
}
