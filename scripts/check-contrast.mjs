// Fails if any text or UI colour pair in src/styles/tokens.css is below WCAG 2.1 AA, in either theme.
import { readFileSync } from 'node:fs'

import { contrastRatio, parseThemes } from './lib/contrast.mjs'

const TEXT = 4.5 // normal-size text
const UI = 3 // UI components, focus indicators, large text

const surfaces = ['canvas', 'surface', 'surface-sky']
const rules = [
  ...['ink', 'ink-muted', 'accent', 'accent-hover', 'danger', 'success'].flatMap((fg) =>
    surfaces.map((bg) => ({ fg, bg, min: TEXT })),
  ),
  { fg: 'on-accent', bg: 'accent', min: TEXT },
  { fg: 'on-accent', bg: 'accent-hover', min: TEXT },
  ...['line-strong', 'focus'].flatMap((fg) => surfaces.map((bg) => ({ fg, bg, min: UI }))),
  // The brand turquoise is decorative except as large text or icons on the canvas.
  { fg: 'brand', bg: 'canvas', min: UI },
  // Night sections (hero, journey, menu, footer): text, accents and focus rings.
  ...['on-night', 'on-night-muted', 'glow', 'glow-strong'].flatMap((fg) =>
    ['night', 'night-raised'].map((bg) => ({ fg, bg, min: TEXT })),
  ),
  { fg: 'night', bg: 'on-night', min: TEXT }, // dark text on the white buttons
  { fg: 'night', bg: 'glow', min: TEXT }, // dark text on glow buttons
]

const themes = parseThemes(
  readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8'),
)
let failures = 0

for (const [theme, tokens] of Object.entries(themes)) {
  for (const { fg, bg, min } of rules) {
    if (!tokens[fg] || !tokens[bg]) {
      console.error(`✗ ${theme}: token missing (${fg} or ${bg})`)
      failures++
      continue
    }
    const ratio = contrastRatio(tokens[fg], tokens[bg])
    const ok = ratio >= min
    if (!ok) failures++
    console.log(
      `${ok ? '✓' : '✗'} ${theme.padEnd(5)} ${fg.padEnd(12)} on ${bg.padEnd(11)} ${ratio.toFixed(2).padStart(5)}:1  (min ${min})`,
    )
  }
}

if (failures) {
  console.error(`\n${failures} contrast check(s) failed.`)
  process.exit(1)
}
console.log(`\nAll ${rules.length * 2} contrast checks passed.`)
