// WCAG 2.1 contrast helpers and a parser for src/styles/tokens.css.

/** @param {string} hex e.g. "#0d6867" */
export function relativeLuminance(hex) {
  const value = hex.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(value)) throw new Error(`Not a 6-digit hex colour: ${hex}`)
  const channel = (i) => {
    const c = parseInt(value.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
}

/** @returns {number} contrast ratio between 1 and 21 */
export function contrastRatio(a, b) {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Splits tokens.css into the light theme (:root) and the dark theme
 * (@media (prefers-color-scheme: dark)); the dark theme inherits tokens it doesn't override.
 * @param {string} css
 * @returns {{ light: Record<string, string>, dark: Record<string, string> }}
 */
export function parseThemes(css) {
  const marker = '@media (prefers-color-scheme: dark)'
  const index = css.indexOf(marker)
  if (index === -1) throw new Error(`tokens.css has no "${marker}" block`)
  const read = (chunk) =>
    Object.fromEntries(
      [...chunk.matchAll(/--yop-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [
        m[1],
        m[2].toLowerCase(),
      ]),
    )
  const light = read(css.slice(0, index))
  return { light, dark: { ...light, ...read(css.slice(index)) } }
}
