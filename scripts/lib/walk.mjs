import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'

/** Source files below `dir` matching `pattern`, skipping paths (relative to `root`) in `skip`. */
export function* walkSources(root, dir, pattern, skip = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    const rel = path.relative(root, full)
    if (skip.some((s) => rel === s || rel.startsWith(`${s}${path.sep}`))) continue
    if (statSync(full).isDirectory()) yield* walkSources(root, full, pattern, skip)
    else if (pattern.test(name)) yield { full, rel }
  }
}
