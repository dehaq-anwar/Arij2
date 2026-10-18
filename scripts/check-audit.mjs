// Runs `npm audit` for production dependencies and fails on any advisory that is not
// explicitly accepted in scripts/audit-allowlist.json, or whose acceptance has expired.
import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { promisify } from 'node:util'

const run = promisify(execFile)
const allowlist = JSON.parse(
  readFileSync(new URL('./audit-allowlist.json', import.meta.url), 'utf8'),
).advisories
const accepted = new Map(allowlist.map((a) => [a.id, a]))

let report
try {
  ;({ stdout: report } = await run('npm', ['audit', '--omit=dev', '--json'], {
    maxBuffer: 64 * 1024 * 1024,
  }))
} catch (error) {
  // npm audit exits non-zero when it finds anything; the JSON is still on stdout.
  report = error.stdout
  if (!report) throw error
}

const advisories = new Map()
for (const [name, vuln] of Object.entries(JSON.parse(report).vulnerabilities ?? {})) {
  for (const via of vuln.via) {
    if (typeof via !== 'object') continue
    const id = via.url.split('/').pop()
    advisories.set(id, { id, name, severity: via.severity, title: via.title })
  }
}

const today = new Date().toISOString().slice(0, 10)
const problems = []
for (const adv of advisories.values()) {
  const entry = accepted.get(adv.id)
  if (!entry) problems.push(`NEW ${adv.severity}: ${adv.name} ${adv.id} — ${adv.title}`)
  else if (entry.reviewBy < today)
    problems.push(`EXPIRED acceptance (reviewBy ${entry.reviewBy}): ${adv.name} ${adv.id}`)
  else console.log(`accepted until ${entry.reviewBy}: ${adv.name} ${adv.id} (${adv.severity})`)
}
for (const id of accepted.keys()) {
  if (!advisories.has(id))
    console.log(`note: ${id} no longer reported — remove it from audit-allowlist.json`)
}

if (problems.length) {
  console.error(`\n${problems.length} unaccepted advisory finding(s):`)
  for (const p of problems) console.error(`  ✗ ${p}`)
  process.exit(1)
}
console.log(`\nAudit OK: ${advisories.size} advisory(ies) reported, all reviewed and accepted.`)
