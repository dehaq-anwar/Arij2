'use client'

import { useEffect } from 'react'

/**
 * One listener for the whole site: cards marked data-spotlight get a soft light at the pointer
 * position (CSS in globals.css). Hover-capable devices only; nothing runs on touch screens.
 */
export function Spotlight() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches) return
    const move = (event: PointerEvent) => {
      const card = (event.target as Element | null)?.closest<HTMLElement>('[data-spotlight]')
      if (!card) return
      const box = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${((event.clientX - box.left) / box.width) * 100}%`)
      card.style.setProperty('--my', `${((event.clientY - box.top) / box.height) * 100}%`)
    }
    document.addEventListener('pointermove', move, { passive: true })
    return () => document.removeEventListener('pointermove', move)
  }, [])
  return null
}
