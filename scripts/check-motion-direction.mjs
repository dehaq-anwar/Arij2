// Fails on hard-coded horizontal GSAP offsets outside the motion presets, so every
// directional animation mirrors in Arabic (RTL). Use dirX() from src/lib/motion/direction.ts.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { findRawHorizontalMotion, IGNORE_MARKER } from './lib/motion-direction.mjs'
import { walkSources } from './lib/walk.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const skip = ['src/app/(payload)', 'src/payload-types.ts', 'src/migrations']

let total = 0
for (const { full, rel } of walkSources(root, path.join(root, 'src'), /\.tsx?$/, skip)) {
  for (const f of findRawHorizontalMotion(readFileSync(full, 'utf8'))) {
    console.error(`${rel}:${f.line}  "${f.match}"  →  ${f.text}`)
    total++
  }
}

if (total) {
  console.error(
    `\n${total} hard-coded horizontal animation value(s). Wrap them in dirX(dir, value) so they mirror in RTL, or add "${IGNORE_MARKER}" with a reason.`,
  )
  process.exit(1)
}
console.log('Motion direction check passed: every horizontal animation value mirrors in RTL.')
