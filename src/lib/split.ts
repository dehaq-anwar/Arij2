const arabic = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/

export type SplitWord = { text: string; units: string[]; arabic: boolean }
export type SplitText = { words: SplitWord[]; arabic: boolean }

/**
 * Splits a headline for the intro animation: Latin words into characters, Arabic words whole
 * (splitting Arabic letters would break their joined shapes). Each word stays one unbreakable
 * unit for line wrapping.
 */
export function splitForAnimation(text: string): SplitText {
  const words = text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const isArabic = arabic.test(word)
      return { text: word, units: isArabic ? [word] : Array.from(word), arabic: isArabic }
    })
  return { words, arabic: words.some((w) => w.arabic) }
}
