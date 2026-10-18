// Finds physical (left/right) CSS that would not mirror in right-to-left languages.

const tailwindPhysical = [
  /-?(?:m|p|scroll-m|scroll-p)[lr]-/, // ml-4, pr-2, -ml-1, scroll-pl-4
  /-?(?:left|right)-/, // left-0, -right-2
  /border-[lr](?![\w-])|border-[lr]-/, // border-l, border-r-2
  /rounded-(?:[lr]|tl|tr|bl|br)(?![\w-])|rounded-(?:[lr]|tl|tr|bl|br)-/, // rounded-l-md, rounded-tr
  /(?:text|float|clear)-(?:left|right)(?![\w-])/, // text-left, float-right
  /-?translate-x-/, // horizontal transforms must be mirrored explicitly
]

const cssPhysical = [
  /\b(?:margin|padding|border|scroll-margin|scroll-padding)-(?:left|right)\b/,
  /(?:^|[\s;{])(?:left|right)\s*:/,
  /\b(?:text-align|float|clear)\s*:\s*(?:left|right)\b/,
]

const jsStylePhysical = [/\b(?:margin|padding|border)(?:Left|Right)\b/]

/** Lines containing this marker are skipped (use only with an explanation). */
export const IGNORE_MARKER = 'logical-css-ok'

/**
 * @param {string} source file contents
 * @param {'css' | 'tsx'} kind
 * @returns {{ line: number, text: string, match: string }[]}
 */
export function findPhysicalCss(source, kind) {
  const patterns =
    kind === 'css'
      ? cssPhysical
      : [
          ...tailwindPhysical.map((p) => new RegExp(`(?<![\\w-])(?:${p.source})`)),
          ...jsStylePhysical,
        ]
  const findings = []
  source.split('\n').forEach((text, i) => {
    if (text.includes(IGNORE_MARKER)) return
    for (const pattern of patterns) {
      const m = text.match(pattern)
      if (m) {
        findings.push({ line: i + 1, text: text.trim(), match: m[0].trim() })
        break
      }
    }
  })
  return findings
}
