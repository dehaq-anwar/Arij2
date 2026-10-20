import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'

import { getCredential } from '../../auth/mfa'
import { currentSession } from '../../auth/session-state'
import { findSession, isPendingUsable, userIdOf } from '../../auth/sessions'
import { readTokenReference } from '../../auth/token'
import { adminLanguage, adminTexts } from '../i18n'
import { SignInClient, type SignInStep } from './SignInClient'

/** Only paths inside the admin are accepted as a destination after signing in. */
function safeRedirect(value: unknown) {
  const path = typeof value === 'string' ? value : ''
  return path.startsWith('/admin') && !path.startsWith('//') && !path.includes('\\')
    ? path
    : '/admin'
}

/**
 * Replaces Payload's sign-in screen. Decides on the server where the person stands: no sign-in
 * yet, password given (enter a code, or set up the app first), or already signed in.
 */
export async function SignInView({ initPageResult, searchParams }: AdminViewServerProps) {
  const { req } = initPageResult
  const destination = safeRedirect(searchParams?.redirect)
  if (req.user && (await currentSession(req))) redirect(destination)

  let step: SignInStep = 'password'
  let name: string | null = null
  const ref = await readTokenReference(req)
  if (ref) {
    const session = await findSession(req.payload, ref.sid, 'pending')
    if (session && String(userIdOf(session)) === String(ref.userId) && isPendingUsable(session)) {
      step = (await getCredential(req.payload, ref.userId)) ? 'verify' : 'enroll'
      const account = await req.payload.findByID({
        collection: 'users',
        id: ref.userId,
        depth: 0,
        overrideAccess: true,
        disableErrors: true,
      })
      name = account?.name ?? null
    }
  }

  const language = adminLanguage(req.i18n?.language)
  return (
    <SignInClient
      initialStep={step}
      initialName={name}
      destination={destination}
      language={language}
      texts={adminTexts[language]}
    />
  )
}
