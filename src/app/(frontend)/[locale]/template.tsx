'use client'

import { useRef, type ReactNode } from 'react'

import { gsap, useGSAP } from '@/lib/motion/gsap'
import { MOTION_OK } from '@/lib/motion/media'

let firstPage = true

/**
 * Page transition: after a client-side navigation the new page rises in softly. Never on the
 * first page load (that content is already visible from the first paint) and never with
 * reduced motion.
 */
export default function Template({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (firstPage) {
        firstPage = false
        return
      }
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from(ref.current, {
          opacity: 0,
          y: 18,
          duration: 0.7,
          ease: 'expo.out',
          clearProps: 'all',
        })
      })
    },
    { scope: ref },
  )

  return <div ref={ref}>{children}</div>
}
