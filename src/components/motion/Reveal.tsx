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
  as?: 'div' | 'section' | 'article' | 'aside'
}

/**
 * Fades/slides its content in once when it scrolls into view.
 * Use only below the fold: until JavaScript has run, revealed content starts invisible
 * (see globals.css), which would delay the largest contentful paint above the fold.
 * With reduced motion or without JavaScript the content is simply visible.
 */
export function Reveal({ children, variant = 'fade-up', className, as = 'div' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const dir = getDirection(useLocale())
  const Tag = as as 'div'

  useGSAP(
    () => {
      const element = ref.current
      if (!element) return
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.fromTo(element, revealFrom(variant, dir), {
          ...revealTo,
          scrollTrigger: { trigger: element, start: motion.triggerStart, once: true },
        })
      })
    },
    { scope: ref, dependencies: [variant, dir] },
  )

  return (
    <Tag ref={ref} data-reveal={variant} className={className}>
      {children}
    </Tag>
  )
}
