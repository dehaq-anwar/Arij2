// Fills an empty CMS with the initial content (placeholders and marked drafts only).
// Usage: npm run seed           (keeps existing content)
//        npm run seed -- force  (overwrites the seeded globals and focus areas)
// `payload run` passes on positional arguments only, so the switch is "force", not "--force".
import { getPayload } from 'payload'

import { seed } from '../src/cms/seed/seed'
import config from '../src/payload.config'

const payload = await getPayload({ config })
await seed(payload, {
  force: process.argv.slice(2).includes('force'),
  log: (m) => payload.logger.info(m),
})
process.exit(0)
