// Lists every "[PLACEHOLDER: …]" still in the site's source and messages.
// Informational by default; `--strict` exits with an error (use it as a launch gate).
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { walkSources } from './lib/walk.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const strict = process.argv.includes('--strict')
const skip = ['src/app/(payload)', 'src/payload-types.ts', 'src/migrations']
const pattern = /\[PLACEHOLDER:\s*([^\]]+)\]/g

const found = []
for (const { full, rel } of walkSources(root, path.join(root, 'src'), /\.(tsx?|json)$/, skip)) {
  readFileSync(full, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      for (const m of line.matchAll(pattern)) found.push(`${rel}:${i + 1}  ${m[1].trim()}`)
    })
}

for (const f of found) console.log(f)
console.log(`\n${found.length} placeholder(s) left to fill.`)
if (strict && found.length) process.exit(1)
