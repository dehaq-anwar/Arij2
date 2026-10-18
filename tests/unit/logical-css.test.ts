import { describe, expect, it } from 'vitest'

import { findPhysicalCss } from '../../scripts/lib/logical-css.mjs'

const matches = (source: string, kind: 'css' | 'tsx' = 'tsx') =>
  findPhysicalCss(source, kind).map((f) => f.match)

describe('findPhysicalCss (Tailwind classes)', () => {
  it.each([
    'ml-4',
    'pr-2',
    '-ml-1',
    'md:pl-6',
    'left-0',
    '-right-2',
    'border-l',
    'border-r-2',
    'rounded-l-md',
    'rounded-tr',
    'text-left',
    'float-right',
    'translate-x-4',
    'hover:-translate-x-1',
  ])('flags %s', (cls) => {
    expect(matches(`<div className="flex ${cls}" />`)).toHaveLength(1)
  })

  it.each([
    'ms-4',
    'pe-2',
    'mx-auto',
    'px-4',
    'start-0',
    'end-2',
    'border-s',
    'rounded-s-md',
    'text-start',
    'inset-x-0',
  ])('accepts %s', (cls) => {
    expect(matches(`<div className="${cls}" />`)).toEqual([])
  })

  it('does not flag words that merely contain the letters', () => {
    expect(matches('const html-left = "<html-root>"; // overflow-left? no: html-')).toEqual([])
    expect(matches('// Mirrors offsets for right-to-left layouts (left-to-right too)')).toEqual([])
  })

  it('honours the ignore marker', () => {
    expect(
      matches('<div className="left-0" /> {/* logical-css-ok: decorative, symmetric */}'),
    ).toEqual([])
  })

  it('flags physical React style props', () => {
    expect(matches('style={{ marginLeft: 4 }}')).toEqual(['marginLeft'])
  })
})

describe('findPhysicalCss (CSS)', () => {
  it('flags physical properties', () => {
    expect(matches('a { margin-left: 1rem; }', 'css')).toHaveLength(1)
    expect(matches('a { left: 0; }', 'css')).toHaveLength(1)
    expect(matches('a { text-align: right; }', 'css')).toHaveLength(1)
  })

  it('accepts logical properties', () => {
    expect(
      matches('a { margin-inline-start: 1rem; inset-inline-start: 0; text-align: start; }', 'css'),
    ).toEqual([])
  })
})
