import { join } from 'node:path'

import { Agent, log } from './agent.ts'
import { loadConfig } from './config.ts'
import { Sampler } from './metrics.ts'
import { Scheduler } from './scheduler.ts'
import { StateStore } from './state.ts'

/** The operations agent's service: HTTP on the internal network, metrics, its own schedule. */
const config = loadConfig()
const state = new StateStore(join(config.stateDir, 'state.json'))
await state.load()
const sampler = new Sampler(config.stateDir)
sampler.start()
const agent = new Agent({ config, state, sampler })
const server = await agent.listen()

const scheduler = new Scheduler(
  [
    {
      name: 'backup',
      weekday: null,
      time: config.backup.time,
      run: async () => {
        if (!agent.startJob('backup', 'schedule')) log({ action: 'backup', skipped: 'busy' })
      },
    },
    {
      name: 'drill',
      weekday: config.backup.drillDay,
      time: config.backup.drillTime,
      run: async () => {
        if (!agent.startJob('drill', 'schedule')) log({ action: 'drill', skipped: 'busy' })
      },
    },
  ],
  config.timeZone,
)
scheduler.start((task, error) => log({ action: task, error: String((error as Error).message) }))

log({ started: true, port: config.port, version: config.version, backup: config.backup.time })

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    scheduler.stop()
    sampler.stop()
    server.close(() => process.exit(0))
    // A running backup is not waited for; the next night's run takes over.
    setTimeout(() => process.exit(0), 5000).unref()
  })
}
