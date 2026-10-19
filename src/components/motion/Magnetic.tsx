'use client'

import { useRef, type ReactNode } from 'react'

import { gsap, useGSAP } from '@/lib/motion/gsap'
import { MOTION_OK } from '@/lib/motion/media'

/**
 * Lets its content lean gently towards the pointer (fine pointers only, motion allowed).
 * The offset follows the pointer itself, so it needs no mirroring for right-to-left pages.
 */
export function Magnetic({ children, strength = 0.3 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null)

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return
      gsap.matchMedia().add(`${MOTION_OK} and (hover: hover) and (pointer: fine)`, () => {
        const toX = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' })
        const toY = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' })
        const move = (event: PointerEvent) => {
          const box = el.getBoundingClientRect()
          toX((event.clientX - (box.left + box.width / 2)) * strength)
          toY((event.clientY - (box.top + box.height / 2)) * strength)
        }
        const leave = () => {
          toX(0)
          toY(0)
        }
        el.addEventListener('pointermove', move)
        el.addEventListener('pointerleave', leave)
        return () => {
          el.removeEventListener('pointermove', move)
          el.removeEventListener('pointerleave', leave)
        }
      })
    },
    { scope: ref },
  )

  return (
    <span ref={ref} className="inline-block p-2 -m-2">
      {children}
    </span>
  )
}
