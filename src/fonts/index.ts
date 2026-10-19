import localFont from 'next/font/local'

/** Readex Pro, variable weight 160–700, Latin subset (covers German and English). */
export const readexLatin = localFont({
  src: [{ path: './readex-pro-latin-wght-normal.woff2', weight: '160 700', style: 'normal' }],
  variable: '--font-readex-latin',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
})

/**
 * Readex Pro, Arabic subset. Not preloaded: the browser fetches it only for Arabic characters
 * (on German and English pages that is just the language switcher's "العربية").
 */
export const readexArabic = localFont({
  src: [{ path: './readex-pro-arabic-wght-normal.woff2', weight: '160 700', style: 'normal' }],
  variable: '--font-readex-arabic',
  display: 'swap',
  preload: false,
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
})

export const fontVariables = `${readexLatin.variable} ${readexArabic.variable}`
