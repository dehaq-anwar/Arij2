import type { Direction } from '@/i18n/locale'

/**
 * Mirrors a horizontal offset for right-to-left layouts: dirX('ltr', 40) === 40, dirX('rtl', 40) === -40.
 * Every horizontal animation value goes through this (enforced by scripts/check-motion-direction.mjs).
 */
export const dirX = (dir: Direction, x: number): number => (dir === 'rtl' ? -x : x)
