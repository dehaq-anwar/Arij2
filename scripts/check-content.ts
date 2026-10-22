// The launch gate on the CMS content: lists every placeholder and every text still marked as a
// draft that visitors can see, with a link to the screen where it is edited.
// Usage: npm run check:content            (list)
//        npm run check:content -- strict  (also exit with an error if anything is left)
// On the server through the tools service (docs/OPERATIONS.md §11).
// `payload run` passes on positional arguments only, so the switch is "strict", not "--strict".
import { getPayload } from 'payload'

import { unfinishedContent } from '../src/lib/content-check'
import config from '../src/payload.config'

const strict = process.argv.slice(2).includes('strict')
const payload = await getPayload({ config })
const found = await unfinishedContent(payload)
const admin = (process.env.ADMIN_URL || process.env.SERVER_URL || '').replace(/\/$/, '')

const link = (where: string) =>
  where.startsWith('globals/')
    ? `${admin}/admin/globals/${where.slice('globals/'.length)}`
    : `${admin}/admin/collections/${where}`

for (const item of found) {
  console.log(
    `${item.kind === 'placeholder' ? 'PLACEHOLDER' : 'DRAFT      '}  ${item.where}  ${item.path}`,
  )
  console.log(`             ${item.text}`)
  console.log(`             ${link(item.where)}`)
}
const placeholders = found.filter((item) => item.kind === 'placeholder').length
console.log(
  `\n${placeholders} placeholder(s) and ${found.length - placeholders} draft text(s) visible on the website.`,
)
process.exit(strict && found.length ? 1 : 0)
