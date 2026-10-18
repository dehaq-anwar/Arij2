import { describe, expect, it } from 'vitest'

import { dirX } from '@/lib/motion/direction'
import { revealFrom } from '@/lib/motion/presets'

import { findRawHorizontalMotion } from '../../scripts/lib/motion-direction.mjs'

describe('dirX', () => {
  it('keeps offsets in LTR and mirrors them in RTL', () => {
    expect(dirX('ltr', 40)).toBe(40)
    expect(dirX('rtl', 40)).toBe(-40)
    expect(dirX('rtl', -32)).toBe(32)
  })
})

describe('revealFrom', () => {
  it('slides in from the reading-start side', () => {
    expect(revealFrom('slide-start', 'ltr').x).toBeLessThan(0) // from the left
    expect(revealFrom('slide-start', 'rtl').x).toBeGreaterThan(0) // from the right
    expect(revealFrom('slide-start', 'rtl').x).toBe(-(revealFrom('slide-start', 'ltr').x as number))
  })

  it('has no horizontal offset for vertical and fade variants', () => {
    expect(revealFrom('fade-up', 'rtl').x).toBeUndefined()
    expect(revealFrom('fade', 'rtl')).toEqual({ opacity: 0 })
  })
})

describe('findRawHorizontalMotion', () => {
  const gsapFile = (line: string) => `import { gsap } from 'gsap'\n${line}`

  it.each([
    'gsap.to(el, { x: 40 })',
    'gsap.from(el, { x: -100, opacity: 0 })',
    'gsap.to(el, { xPercent: -100 })',
    "gsap.to(el, { x: '2rem' })",
    'gsap.to(el, { x: 0.5 })',
  ])('flags %s', (line) => {
    expect(findRawHorizontalMotion(gsapFile(line))).toHaveLength(1)
  })

  it.each([
    'gsap.to(el, { x: 0 })',
    "gsap.to(el, { x: '0px' })",
    'gsap.to(el, { x: dirX(dir, 40) })',
    'gsap.to(el, { y: 40 })',
    'const box = { max: 4 }',
  ])('accepts %s', (line) => {
    expect(findRawHorizontalMotion(gsapFile(line))).toEqual([])
  })

  it('ignores files that do not animate', () => {
    expect(findRawHorizontalMotion('const point = { x: 40, y: 2 }')).toEqual([])
  })

  it('honours the ignore marker', () => {
    expect(
      findRawHorizontalMotion(
        gsapFile('gsap.to(el, { x: 40 }) // motion-direction-ok: symmetric shake'),
      ),
    ).toEqual([])
  })
})
