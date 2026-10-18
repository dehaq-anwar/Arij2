'use client'

import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { usePathname } from 'next/navigation'
import { createContext, useContext, useEffect, useRef, type ReactNode, type RefObject } from 'react'

import { gsap, ScrollTrigger } from '@/lib/motion/gsap'
import { MOTION_OK } from '@/lib/motion/media'

const LenisContext = createContext<RefObject<Lenis | null> | null>(null)

/** The active Lenis instance (null with reduced motion), e.g. to pause scrolling behind a modal. */
export const useLenis = () => useContext(LenisContext)

/**
 * Site-wide smooth scrolling. Lenis runs on GSAP's ticker, so there is a single
 * requestAnimationFrame loop for scrolling and all animations, and ScrollTrigger
 * updates on every Lenis scroll. With prefers-reduced-motion Lenis is never created
 * (native scrolling); the preference is followed live, without a reload.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-motion-ready', '')
    const query = window.matchMedia(MOTION_OK)
    let tick: ((time: number) => void) | null = null

    const start = () => {
      if (lenisRef.current) return
      const lenis = new Lenis({ autoRaf: false, anchors: false, stopInertiaOnNavigate: true })
      lenis.on('scroll', ScrollTrigger.update)
      tick = (time: number) => lenis.raf(time * 1000)
      gsap.ticker.add(tick)
      gsap.ticker.lagSmoothing(0)
      lenisRef.current = lenis
    }

    const stop = () => {
      if (tick) gsap.ticker.remove(tick)
      tick = null
      lenisRef.current?.destroy()
      lenisRef.current = null
      gsap.ticker.lagSmoothing(500, 33) // GSAP's default
    }

    const apply = () => (query.matches ? start() : stop())
    apply()
    query.addEventListener('change', apply)
    return () => {
      query.removeEventListener('change', apply)
      stop()
    }
  }, [])

  // New page: start at its top (unless an anchor is targeted) and re-measure scroll triggers.
  useEffect(() => {
    if (!window.location.hash) lenisRef.current?.scrollTo(0, { immediate: true, force: true })
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(frame)
  }, [pathname])

  return <LenisContext.Provider value={lenisRef}>{children}</LenisContext.Provider>
}
