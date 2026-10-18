// Finds hard-coded horizontal animation offsets, which would not mirror in Arabic (RTL).

/** Lines containing this marker are skipped (use only with an explanation). */
export const IGNORE_MARKER = 'motion-direction-ok'

// `x: 40`, `xPercent: -100`, `x: '2rem'`, `x: "-50%"` — but not `x: 0` and not `x: dirX(dir, 40)`.
const rawHorizontal =
  /(?<![\w$.])(?:x|xPercent)\s*:\s*(?:-?(?:[1-9][\d.]*|0?\.\d*[1-9]\d*)|['"`]-?(?!0(?:px|rem|em|%)?['"`])[\d.]+)/

const usesMotion = /from\s+['"](?:gsap(?:\/[\w-]+)?|@gsap\/react|@\/lib\/motion\/[\w-]+)['"]/

/**
 * @param {string} source
 * @returns {{ line: number, text: string, match: string }[]}
 */
export function findRawHorizontalMotion(source) {
  if (!usesMotion.test(source)) return []
  const findings = []
  source.split('\n').forEach((text, i) => {
    if (text.includes(IGNORE_MARKER)) return
    const m = text.match(rawHorizontal)
    if (m) findings.push({ line: i + 1, text: text.trim(), match: m[0] })
  })
  return findings
}
