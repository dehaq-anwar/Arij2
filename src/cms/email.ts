import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import type { EmailAdapter, Payload, SendEmailOptions } from 'payload'

import { checkMailHost, internalHostsAllowed } from './mail/host-policy'
import { recordDelivery } from './mail/log'
import { DEFAULT_FROM_NAME, mailSettings, type MailSettings } from './mail/settings'
import { PASSWORD_RESET_SUBJECT, TEMPLATE_HEADER } from './mail/templates'
import { notify, recipientsWith } from './membership/notifications'

type Send = (message: SendEmailOptions) => Promise<unknown>

let transport: { key: string; send: Send } | null = null

/**
 * Where to connect: a server set on the server (.env) as it is; one entered in the Control Center
 * only after the check in mail/host-policy.ts, at the address that was checked.
 */
async function addressOf(settings: MailSettings): Promise<string> {
  const host = settings.host ?? ''
  if (settings.source.host !== 'settings' || internalHostsAllowed()) return host
  const check = await checkMailHost(host, settings.port)
  if (!check.ok) throw Object.assign(new Error(`Mail server not used: ${check.code}`), check)
  return check.address
}

/** One SMTP connection setup per set of settings (host, port, user); rebuilt when they change. */
async function sender(payload: Payload, settings: MailSettings, address: string): Promise<Send> {
  const key = [address, settings.host, settings.port, settings.user, settings.passwordSet].join('|')
  if (transport?.key === key) return transport.send
  const adapter = await nodemailerAdapter({
    defaultFromAddress: settings.fromAddress ?? '',
    defaultFromName: settings.fromName,
    // Checked on first use instead of at startup, so a mail outage never blocks the website.
    skipVerify: true,
    transportOptions: {
      host: address,
      // The certificate is checked against the name, also when connecting to a checked address.
      servername: settings.host ?? undefined,
      port: settings.port,
      // Port 465 uses TLS from the start; other ports must upgrade with STARTTLS.
      secure: settings.port === 465,
      requireTLS: settings.port !== 465,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      // `auth` belongs to nodemailer's SMTP transport options, which the adapter's type (the
      // bare connection options) does not list; nodemailer reads it (checked against a test
      // server). The password is only ever read from the server's environment.
      ...(settings.user
        ? { auth: { user: settings.user, pass: process.env.SMTP_PASSWORD ?? '' } }
        : {}),
    } as never,
  })
  transport = { key, send: adapter({ payload }).sendEmail as Send }
  return transport.send
}

const templateOf = (message: SendEmailOptions) => {
  const headers = (message.headers ?? {}) as Record<string, unknown>
  const named = headers[TEMPLATE_HEADER]
  if (typeof named === 'string') return named
  return message.subject === PASSWORD_RESET_SUBJECT ? 'passwordReset' : 'other'
}

const errorCode = (error: unknown) => {
  const e = error as { code?: unknown; responseCode?: unknown; command?: unknown }
  return [e.code, e.responseCode].filter(Boolean).join(' ').slice(0, 60) || 'ERROR'
}

/**
 * Sends with the settings in effect (e-mail settings in the Control Center, else .env) and
 * writes one delivery-log entry. Without a mail server nothing is sent and nothing is written
 * to the log either: Payload's built-in fallback prints whole e-mails, which would put
 * password-reset links into the logs. Failures warn those who manage e-mail, in the bell.
 */
export async function deliver(payload: Payload, message: SendEmailOptions) {
  const template = templateOf(message)
  const headers = { ...((message.headers ?? {}) as Record<string, string>) }
  delete headers[TEMPLATE_HEADER]
  const settings = await mailSettings(payload)
  if (!settings.host || !settings.fromAddress) {
    payload.logger.warn('E-mail not sent: no mail server configured')
    await recordDelivery(payload, { template, to: message.to, status: 'notConfigured' })
    return null
  }
  const started = Date.now()
  try {
    const send = await sender(payload, settings, await addressOf(settings))
    const result = await send({
      ...message,
      headers,
      from: `"${settings.fromName.replace(/"/g, '')}" <${settings.fromAddress}>`,
    })
    await recordDelivery(payload, {
      template,
      to: message.to,
      status: 'sent',
      durationMs: Date.now() - started,
    })
    return result
  } catch (error) {
    await recordDelivery(payload, {
      template,
      to: message.to,
      status: 'failed',
      errorCode: errorCode(error),
      durationMs: Date.now() - started,
    })
    try {
      await notify(payload, {
        kind: 'emailFailed',
        recipients: await recipientsWith(payload, 'email.manage'),
        subjectType: 'operations',
        subjectId: 'email',
        href: '/admin/email',
        dedupe: 'day',
      })
    } catch {
      // The delivery log has the entry.
    }
    throw error
  }
}

export const emailAdapter =
  (): EmailAdapter =>
  ({ payload }) => ({
    name: 'yop-smtp',
    defaultFromAddress: process.env.SMTP_FROM || 'website@localhost',
    defaultFromName: DEFAULT_FROM_NAME,
    sendEmail: (message) => deliver(payload, message),
  })
