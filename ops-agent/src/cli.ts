import { join } from 'node:path'

import { runBackup } from './backup.ts'
import { loadConfig } from './config.ts'
import { runDrill } from './drill.ts'
import { StateStore } from './state.ts'

/**
 * Backups and drills from the command line, with the same code as the service:
 *   node src/cli.ts backup | drill | verify   (verify = backup, then drill; CI uses it)
 * Exits with 1 when the result is not ok and prints each result as one JSON line (counts, never
 * data).
 */
const command = process.argv[2]
if (!['backup', 'drill', 'verify'].includes(command ?? '')) {
  process.stderr.write('usage: node src/cli.ts backup | drill | verify\n')
  process.exit(2)
}
const config = loadConfig()
const state = new StateStore(join(config.stateDir, 'state.json'))
await state.load()

let ok = true
if (command === 'backup' || command === 'verify') {
  const event = await runBackup(config, state, 'manual')
  process.stdout.write(`${JSON.stringify(event)}\n`)
  ok &&= event.ok
}
if (ok && (command === 'drill' || command === 'verify')) {
  const event = await runDrill(config, state, 'manual', { readDataSubset: '100%' })
  process.stdout.write(`${JSON.stringify(event)}\n`)
  ok &&= event.ok
}
process.exit(ok ? 0 : 1)
