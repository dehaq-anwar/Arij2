import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP)

  // Read-only counters for the end-to-end tests (leak checks after navigation).
  // Exposed only to automated browsers (navigator.webdriver), never to visitors.
  if (navigator.webdriver) {
    Object.assign(window, {
      __yopMotion: {
        scrollTriggers: () => ScrollTrigger.getAll().length,
        tweens: () => gsap.globalTimeline.getChildren(true, true, false).length,
      },
    })
  }
}

export { gsap, ScrollTrigger, useGSAP }
