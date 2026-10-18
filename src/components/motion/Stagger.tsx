'use client'

import { useLocale } from 'next-intl'
import { useRef, type ReactNode } from 'react'

import { getDirection } from '@/i18n/locale'
import { gsap, useGSAP } from '@/lib/motion/gsap'
import { MOTION_OK } from '@/lib/motion/media'
import { motion, revealFrom, revealTo, type RevealVariant } from '@/lib/motion/presets'

type Props = {
  children: ReactNode
  variant?: RevealVariant
  className?: string
  as?: 'div' | 'ul' | 'ol'
}

/**
 * Reveals its direct items (elements marked with data-stagger-item) one after another
 * when the group scrolls into view. Same rules as <Reveal>: below the fold only.
 */
export function Stagger({ children, variant = 'fade-up', className, as = 'div' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const dir = getDirection(useLocale())
  const Tag = as as 'div'

  useGSAP(
    () => {
      const container = ref.current
      if (!container) return
      const items = container.querySelectorAll<HTMLElement>('[data-stagger-item]')
      if (!items.length) return
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.fromTo(items, revealFrom(variant, dir), {
          ...revealTo,
          stagger: motion.stagger,
          scrollTrigger: { trigger: container, start: motion.triggerStart, once: true },
        })
      })
    },
    { scope: ref, dependencies: [variant, dir] },
  )

  return (
    <Tag ref={ref} data-stagger={variant} className={className}>
      {children}
    </Tag>
  )
}
