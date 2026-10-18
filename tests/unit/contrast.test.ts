import { describe, expect, it } from 'vitest'

import { contrastRatio, parseThemes } from '../../scripts/lib/contrast.mjs'

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
    // Brand turquoise on white, as measured for the plan.
    expect(contrastRatio('#1b9c9b', '#ffffff')).toBeCloseTo(3.35, 2)
  })

  it('is symmetric', () => {
    expect(contrastRatio('#04324e', '#e8f4f6')).toBe(contrastRatio('#e8f4f6', '#04324e'))
  })

  it('rejects malformed colours', () => {
    expect(() => contrastRatio('#fff', '#000000')).toThrow()
  })
})

describe('parseThemes', () => {
  const css = `:root { --yop-a: #111111; --yop-b: #222222; }
@media (prefers-color-scheme: dark) { :root { --yop-a: #EEEEEE; } }`

  it('lets the dark theme inherit tokens it does not override', () => {
    const { light, dark } = parseThemes(css)
    expect(light).toEqual({ a: '#111111', b: '#222222' })
    expect(dark).toEqual({ a: '#eeeeee', b: '#222222' })
  })

  it('requires a dark block', () => {
    expect(() => parseThemes(':root { --yop-a: #111111; }')).toThrow()
  })
})
