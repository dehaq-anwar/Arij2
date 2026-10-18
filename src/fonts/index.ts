import localFont from 'next/font/local'

/** IBM Plex Sans, variable weight 100–700, Latin subset (covers German and English). */
export const plexSans = localFont({
  src: [{ path: './ibm-plex-sans-latin-wght-normal.woff2', weight: '100 700', style: 'normal' }],
  variable: '--font-plex-sans',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
})

/**
 * IBM Plex Sans Arabic, regular and bold. Not preloaded: only Arabic text requests it,
 * so German and English pages don't download it.
 */
export const plexArabic = localFont({
  src: [
    { path: './ibm-plex-sans-arabic-arabic-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './ibm-plex-sans-arabic-arabic-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-plex-arabic',
  display: 'swap',
  preload: false,
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
})

export const fontVariables = `${plexSans.variable} ${plexArabic.variable}`
