// Creates a super administrator account on the server. The CMS has no open sign-up, also not
// for the very first account, so this is how a new installation gets its first admin.
// Usage: npm run create-admin -- <email> "<name>"
// The password comes from ADMIN_PASSWORD if set; otherwise a random one is printed once.
// At the first sign-in the account must set up two-factor sign-in (authenticator app) before
// anything else, so do that right away. Change the password afterwards (Account).
import { randomBytes } from 'node:crypto'

import { getPayload } from 'payload'

import { MIN_PASSWORD_LENGTH, SERVER_COMMAND } from '../src/cms/collections/Users'
import config from '../src/payload.config'

const [email, ...nameParts] = process.argv.slice(2)
const name = nameParts.join(' ').trim()
if (!email || !email.includes('@') || !name) {
  console.error('Usage: npm run create-admin -- <email> "<name>"')
  process.exit(1)
}
const given = process.env.ADMIN_PASSWORD
if (given !== undefined && given.length < MIN_PASSWORD_LENGTH) {
  console.error(`ADMIN_PASSWORD must have at least ${MIN_PASSWORD_LENGTH} characters.`)
  process.exit(1)
}
const password = given || randomBytes(18).toString('base64url')

const payload = await getPayload({ config })
const { totalDocs } = await payload.count({
  collection: 'users',
  where: { email: { equals: email } },
})
if (totalDocs > 0) {
  console.error(`An account for ${email} already exists.`)
  process.exit(1)
}
await payload.create({
  collection: 'users',
  data: { email, name, password, role: 'superAdmin' },
  context: { [SERVER_COMMAND]: true },
})
console.log(`Super administrator ${email} created.`)
console.log(
  `Sign in at ${(process.env.ADMIN_URL || process.env.SERVER_URL || '').replace(/\/$/, '')}/admin now and set up two-factor sign-in.`,
)
if (!given)
  console.log(`Initial password (shown only now, change it after signing in): ${password}`)
process.exit(0)
