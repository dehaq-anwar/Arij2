// Fails if any package in package-lock.json (direct or transitive) was published less than
// RELEASE_AGE_DAYS (default 14) days ago, or does not come from the npm registry.
// Publish times never change, so results are cached in .cache/release-age.json.
import { execFile } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cacheFile = path.join(root, '.cache', 'release-age.json')
const minAgeDays = Number(process.env.RELEASE_AGE_DAYS ?? 14)
const concurrency = 8
const now = Date.now()

const lock = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
const problems = []
const wanted = new Map() // name -> Set(version)

for (const [key, entry] of Object.entries(lock.packages ?? {})) {
  if (key === '' || entry.link) continue
  const name = entry.name ?? key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length)
  if (entry.resolved && !entry.resolved.startsWith('https://registry.npmjs.org/')) {
    problems.push(`${name}@${entry.version}: not from the npm registry (${entry.resolved})`)
    continue
  }
  if (!wanted.has(name)) wanted.set(name, new Set())
  wanted.get(name).add(entry.version)
}

let cache = {}
try {
  cache = JSON.parse(readFileSync(cacheFile, 'utf8'))
} catch {
  // first run
}

const missing = [...wanted].filter(([name, versions]) =>
  [...versions].some((v) => !cache[`${name}@${v}`]),
)

async function lookup([name, versions]) {
  try {
    const { stdout } = await run('npm', ['view', name, 'time', '--json'], {
      maxBuffer: 256 * 1024 * 1024,
    })
    const times = JSON.parse(stdout)
    for (const v of versions) {
      if (times[v]) cache[`${name}@${v}`] = times[v]
      else problems.push(`${name}@${v}: no publish time in the registry`)
    }
  } catch (error) {
    problems.push(`${name}: registry lookup failed (${error.message.split('\n')[0]})`)
  }
}

for (let i = 0; i < missing.length; i += concurrency) {
  await Promise.all(missing.slice(i, i + concurrency).map(lookup))
}

mkdirSync(path.dirname(cacheFile), { recursive: true })
writeFileSync(cacheFile, JSON.stringify(cache, null, 1))

let checked = 0
let newest = null
for (const [name, versions] of wanted) {
  for (const v of versions) {
    const published = cache[`${name}@${v}`]
    if (!published) continue
    checked++
    const ageDays = (now - Date.parse(published)) / 86_400_000
    if (!newest || ageDays < newest.ageDays) newest = { id: `${name}@${v}`, published, ageDays }
    if (ageDays < minAgeDays) {
      problems.push(
        `${name}@${v}: published ${published.slice(0, 10)} (${ageDays.toFixed(1)} days ago)`,
      )
    }
  }
}

console.log(
  `Checked ${checked} package versions (${missing.length} package names looked up in the registry, the rest from cache).`,
)
if (newest) {
  console.log(
    `Newest: ${newest.id}, published ${newest.published.slice(0, 10)} (${newest.ageDays.toFixed(1)} days ago).`,
  )
}
if (problems.length) {
  console.error(`\n${problems.length} problem(s) (minimum age ${minAgeDays} days):`)
  for (const p of problems.sort()) console.error(`  ✗ ${p}`)
  process.exit(1)
}
console.log(`All packages are at least ${minAgeDays} days old.`)
