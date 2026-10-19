'use client'

import { useRef } from 'react'

import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion/gsap'
import { MOTION_OK } from '@/lib/motion/media'

/**
 * Scroll scene of the home page: night slowly turns into day while the first line ("Founded in
 * Yemen in 2013") gives way to the second ("now also active in Germany"). Pinned on large
 * screens, scrubbed with the scroll position everywhere.
 *
 * Without JavaScript or with reduced motion it is a static band from night to day with both lines
 * (see the .journey rules in globals.css), so no content depends on the animation.
 */
export function Journey({ from, to }: { from: string; to: string }) {
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const section = ref.current
      if (!section) return
      const mm = gsap.matchMedia()
      mm.add({ motion: MOTION_OK, large: '(min-width: 64rem)' }, (context) => {
        if (!context.conditions?.motion) return
        const large = Boolean(context.conditions.large)
        const day = getComputedStyle(document.documentElement)
          .getPropertyValue('--yop-canvas')
          .trim()
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: section,
            start: large ? 'top top' : 'top 75%',
            end: large ? '+=110%' : 'bottom 25%',
            pin: large,
            scrub: 0.8,
            onUpdate: (self) => {
              // The header follows: light text while it is night, dark once it is day.
              section.dataset.surface = self.progress < 0.6 ? 'night' : 'day'
            },
          },
        })
        tl.to(section, {
          keyframes: { backgroundColor: ['#021b2b', '#0b4a5e', '#5fa7c9', day || '#f2f7fa'] },
          duration: 1,
        })
          .to('[data-journey="from"]', { opacity: 0, yPercent: -30, duration: 0.35 }, 0.2)
          .fromTo(
            '[data-journey="to"]',
            { opacity: 0, yPercent: 30 },
            { opacity: 1, yPercent: 0, duration: 0.35 },
            0.55,
          )
          .fromTo('[data-journey="line"]', { scaleY: 0 }, { scaleY: 1, duration: 1 }, 0)
        return () => {
          section.dataset.surface = 'night'
        }
      })
      return () => {
        mm.revert()
        ScrollTrigger.refresh()
      }
    },
    { scope: ref },
  )

  return (
    <section ref={ref} data-surface="night" className="journey relative isolate overflow-hidden">
      <div className="journey-stage mx-auto flex max-w-[84rem] flex-col items-center justify-center px-5 text-center sm:px-8 lg:px-12">
        <span aria-hidden="true" data-journey="line" className="journey-line" />
        <p data-journey="from" className="journey-from text-title">
          {from}
        </p>
        <p data-journey="to" className="journey-to text-title">
          {to}
        </p>
      </div>
    </section>
  )
}
