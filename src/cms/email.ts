import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import type { EmailAdapter } from 'payload'

const fromName = 'Youth of Peace e.V. – Website'

/**
 * Without SMTP settings nothing is sent and nothing is written to the log either: Payload's
 * built-in fallback prints whole e-mails, which would put password-reset links into the logs.
 */
const disabled: EmailAdapter = ({ payload }) => ({
  name: 'disabled',
  defaultFromAddress: 'website@localhost',
  defaultFromName: fromName,
  sendEmail: async () => {
    payload.logger.warn('E-mail not sent: SMTP_HOST is not configured')
  },
})

/** SMTP (e.g. the association's mail provider) when SMTP_HOST is set. */
export const emailAdapter = () => {
  const host = process.env.SMTP_HOST
  if (!host) return disabled
  const port = Number(process.env.SMTP_PORT || 587)
  const transportOptions = {
    host,
    port,
    // Port 465 uses TLS from the start; other ports must upgrade with STARTTLS.
    secure: port === 465,
    requireTLS: port !== 465,
    // `auth` belongs to nodemailer's SMTP transport options, which the adapter's type (the bare
    // connection options) does not list; nodemailer reads it (checked against a test server).
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  }
  return nodemailerAdapter({
    defaultFromAddress: process.env.SMTP_FROM || '',
    defaultFromName: fromName,
    // Checked on first use instead of at startup, so a mail outage never blocks the website.
    skipVerify: true,
    transportOptions,
  })
}
