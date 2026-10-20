// Emergency access recovery, run on the server by someone with server access:
// resets the second factor of one account and ends all its sessions. The person sets up their
// authenticator app again at the next sign-in. Logged in the audit log and reported to the
// account by e-mail. Use it when someone lost both their phone and their recovery codes and no
// other super administrator can reset it in the Control Center.
// Usage: npm run reset-mfa -- <email>
import { getPayload } from 'payload'

import { audit } from '../src/cms/audit/log'
import { deleteCredential } from '../src/cms/auth/mfa'
import { sendSecurityNotice } from '../src/cms/auth/notify'
import { endAllSessions } from '../src/cms/auth/sessions'
import config from '../src/payload.config'

const email = process.argv[2]?.trim().toLowerCase()
if (!email || !email.includes('@')) {
  console.error('Usage: npm run reset-mfa -- <email>')
  process.exit(1)
}

const payload = await getPayload({ config })
const { docs } = await payload.find({
  collection: 'users',
  where: { email: { equals: email } },
  limit: 1,
  depth: 0,
  overrideAccess: true,
})
const account = docs[0]
if (!account) {
  console.error(`No account for ${email}.`)
  process.exit(1)
}
await deleteCredential(payload, account.id)
await payload.delete({
  collection: 'trusted-devices',
  where: { user: { equals: account.id } },
  overrideAccess: true,
})
await endAllSessions(payload, account.id, 'mfaReset')
await audit(payload, {
  action: 'users.reset-mfa',
  area: 'users',
  actor: null,
  target: { type: 'users', id: account.id, label: account.name },
  detail: { source: 'server-command' },
})
await sendSecurityNotice(payload, account.email, { kind: 'mfaReset' })
console.log(`Two-factor sign-in of ${email} reset; all sessions ended.`)
process.exit(0)
