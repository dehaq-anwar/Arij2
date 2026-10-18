import type { Direction } from '@/i18n/locale'

import { dirX } from './direction'

/** Calm, short motion: it supports reading and never delays it. */
export const motion = {
  duration: 0.6,
  ease: 'power2.out',
  stagger: 0.08,
  distance: 24,
  slideDistance: 32,
  /** A reveal starts when the element's top passes 90% of the viewport height. */
  triggerStart: 'top 90%',
} as const

export type RevealVariant = 'fade' | 'fade-up' | 'slide-start'

/**
 * Starting state of a reveal. "slide-start" comes in from the reading-start side:
 * from the left in German/English, from the right in Arabic.
 */
export function revealFrom(variant: RevealVariant, dir: Direction): gsap.TweenVars {
  switch (variant) {
    case 'fade':
      return { opacity: 0 }
    case 'slide-start':
      return { opacity: 0, x: dirX(dir, -motion.slideDistance) }
    case 'fade-up':
      return { opacity: 0, y: motion.distance }
  }
}

export const revealTo: gsap.TweenVars = {
  opacity: 1,
  x: 0,
  y: 0,
  duration: motion.duration,
  ease: motion.ease,
}
