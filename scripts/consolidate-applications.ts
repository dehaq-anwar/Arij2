// Moves the personal data of accepted membership applications to the members register, keeping
// in the application only the proof of the decision and the consent (proposal for decision 12,
// docs/CONTROL-CENTER.md §16; src/cms/membership/consolidate.ts). Run on the server by someone
// with server access, only after the association has approved the proposal and after a backup.
//
// Usage: npm run membership:consolidate              report only (changes nothing)
//        npm run membership:consolidate -- --apply   move the data (needs MEMBERSHIP_CONSOLIDATION=on)
import { getPayload } from 'payload'

import { consolidateAll, consolidationEnabled } from '../src/cms/membership/consolidate'
import config from '../src/payload.config'

const apply = process.argv.includes('--apply')
if (apply && !consolidationEnabled()) {
  console.error(
    'Refused: set MEMBERSHIP_CONSOLIDATION=on only after the association approved the proposal (and make a backup first).',
  )
  process.exit(1)
}

const payload = await getPayload({ config })
const results = await consolidateAll(payload, { apply })
let moved = 0
for (const result of results) {
  if ('error' in result) {
    console.log(`#${result.application}: FAILED, nothing changed — ${result.error}`)
  } else if (result.action === 'skip') {
    console.log(`#${result.application}: skipped (${result.reason})`)
  } else {
    moved++
    const differences = result.differences.length
      ? `; outdated in the application: ${result.differences.join(', ')}`
      : ''
    console.log(
      `#${result.application}: ${apply ? 'moved' : 'would move'} ${result.clears.join(', ') || '—'} (register entry #${result.member})${differences}`,
    )
  }
}
console.log(
  `${results.length} accepted application(s); ${moved} ${apply ? 'moved' : 'to move'}; ${results.length - moved} skipped or failed.${apply ? '' : ' Nothing was changed (report only).'}`,
)
process.exit(results.some((r) => 'error' in r) ? 2 : 0)
