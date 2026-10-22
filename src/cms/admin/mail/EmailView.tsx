import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'

import { adminUrl } from '@/lib/site'

import { checkMailHost, internalHostsAllowed, type HostCheck } from '../../mail/host-policy'
import { mailSettings, type MailSettings } from '../../mail/settings'
import {
  alertMail,
  mailTime,
  newSubmissionMail,
  passwordResetMail,
  securityNoticeMail,
  testMail,
  type Rendered,
} from '../../mail/templates'
import { ALERT_TEXTS } from '../../operations/alert-email'
import { formatDateTime } from '../i18n'
import { Icon } from '../icons'
import {
  allowedTo,
  opsContext,
  OpsTemplate,
  PageHead,
  StatePill,
  type Tone,
} from '../operations/shared'
import { DnsChecks, TestMailButton } from './MailClient'
import { mailText, mailTexts } from './texts'

type LogEntry = {
  id: number
  createdAt: string
  template: string
  recipient: string
  status: 'sent' | 'failed' | 'notConfigured'
  errorCode?: string | null
}

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 3_600_000).toISOString()

/**
 * Whether sending will refuse the server entered on this screen (mail/host-policy.ts), so the
 * screen says so right after saving instead of at the first failed e-mail. A lookup that takes
 * longer than three seconds is left to the sending itself.
 */
async function refusalOf(settings: MailSettings): Promise<HostCheck | null> {
  if (!settings.host || settings.source.host !== 'settings' || internalHostsAllowed()) return null
  const check = await Promise.race([
    checkMailHost(settings.host, settings.port),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 3_000)),
  ])
  return check && !check.ok ? check : null
}

const DELIVERY_TONE: Record<LogEntry['status'], Tone> = {
  sent: 'good',
  failed: 'bad',
  notConfigured: 'neutral',
}

/** Every e-mail the website sends, with sample links: exactly what goes out. */
function previews(): { template: string; mail: Rendered }[] {
  const base = adminUrl()
  const when = mailTime()
  return [
    {
      template: 'newApplication',
      mail: newSubmissionMail(
        'membership-applications',
        `${base}/admin/collections/membership-applications/123`,
      ),
    },
    {
      template: 'newMessage',
      mail: newSubmissionMail('contact-messages', `${base}/admin/collections/contact-messages/45`),
    },
    { template: 'passwordReset', mail: passwordResetMail(`${base}/admin/reset/…`) },
    {
      template: 'securityNotice',
      mail: securityNoticeMail(
        { kind: 'newDevice', browser: 'Firefox', os: 'Linux' },
        when,
        `${base}/admin/security`,
      ),
    },
    {
      template: 'alert',
      mail: alertMail(
        ALERT_TEXTS.opsBackupFailed,
        '2026-10-22 02:30',
        `${base}/admin/operations/backups`,
      ),
    },
    { template: 'test', mail: testMail(when, `${base}/admin/email`) },
  ]
}

/**
 * E-mail (docs/CONTROL-CENTER.md §6), for `email.manage`: the mail server in use, the counts of
 * the last 30 days, the domain's deliverability, the delivery log, the templates with previews
 * and the addresses. Settings are edited in the e-mail settings (with a code); the password
 * stays on the server.
 */
export async function EmailView(props: AdminViewServerProps) {
  const ctx = await opsContext(props, '/admin/email')
  const { req, language, o } = ctx
  const m = mailTexts[language]
  if (!allowedTo(ctx, 'email.manage')) {
    return (
      <OpsTemplate props={props}>
        <div className="yop-page">
          <div className="yop-notice yop-notice--warning" role="status">
            <Icon name="lock" />
            <div>{o.notAllowed}</div>
          </div>
        </div>
      </OpsTemplate>
    )
  }
  const settings = await mailSettings(req.payload)
  const since = daysAgo(30)
  const count = (status: LogEntry['status']) =>
    req.payload
      .count({
        collection: 'email-log',
        where: { and: [{ status: { equals: status } }, { createdAt: { greater_than: since } }] },
        overrideAccess: true,
        req,
      })
      .then((r) => r.totalDocs)
  const [sent, failed, skipped, log, refusal] = await Promise.all([
    count('sent'),
    count('failed'),
    count('notConfigured'),
    req.payload.find({
      collection: 'email-log',
      sort: '-createdAt',
      limit: 50,
      depth: 0,
      overrideAccess: true,
      req,
    }),
    refusalOf(settings),
  ])
  const configured = Boolean(settings.host && settings.fromAddress)
  const entries = log.docs as unknown as LogEntry[]

  return (
    <OpsTemplate props={props}>
      <div className="yop-page yop-ops">
        <PageHead
          eyebrow={o.navOperations}
          title={m.title}
          lead={m.lead}
          icon="mail"
          actions={
            <>
              <Link className="yop-button" href="/admin/globals/email-settings" prefetch={false}>
                <Icon name="settings" />
                {m.editSettings}
              </Link>
              <TestMailButton disabled={!configured} />
            </>
          }
        />
        {!configured ? (
          <div className="yop-notice yop-notice--info yop-ops-notice" role="status">
            <Icon name="info" />
            <div>
              <strong>{m.notConfiguredTitle}</strong>
              <p>{m.notConfiguredBody}</p>
            </div>
          </div>
        ) : null}
        {refusal && !refusal.ok ? (
          <div className="yop-notice yop-notice--warning yop-ops-notice" role="status">
            <Icon name="alert" />
            <div>
              <strong>{m.hostRefusedTitle}</strong>
              <p>{mailText(m, `refused_${refusal.code}`, refusal.code)}</p>
            </div>
          </div>
        ) : null}

        <section className="yop-grid yop-grid--stats" aria-label={m.title}>
          <div className="yop-card yop-stat">
            <span className="yop-stat__top">
              <span className="yop-stat__label">{m.server}</span>
              <span className="yop-stat__icon">
                <Icon name="server" />
              </span>
            </span>
            <span className="yop-stat__value yop-stat__value--small" dir="ltr">
              {settings.host ? `${settings.host}:${settings.port}` : m.serverNone}
            </span>
            {settings.host ? (
              <span className="yop-stat__hint">
                {settings.port === 465 ? m.tls : m.starttls} ·{' '}
                {settings.source.host === 'settings' ? m.fromSettings : m.fromServer}
              </span>
            ) : null}
          </div>
          <div className="yop-card yop-stat">
            <span className="yop-stat__top">
              <span className="yop-stat__label">{m.sent30}</span>
              <span className="yop-stat__icon yop-stat__icon--good">
                <Icon name="check" />
              </span>
            </span>
            <span className="yop-stat__value">{sent}</span>
          </div>
          <div className="yop-card yop-stat">
            <span className="yop-stat__top">
              <span className="yop-stat__label">{m.failed30}</span>
              <span className={`yop-stat__icon${failed ? ' yop-stat__icon--warning' : ''}`}>
                <Icon name="alert" />
              </span>
            </span>
            <span className="yop-stat__value">{failed}</span>
            <span className="yop-stat__hint">{m.failedHint}</span>
          </div>
          <div className="yop-card yop-stat">
            <span className="yop-stat__top">
              <span className="yop-stat__label">{m.skipped30}</span>
              <span className="yop-stat__icon">
                <Icon name="info" />
              </span>
            </span>
            <span className="yop-stat__value">{skipped}</span>
          </div>
        </section>

        <DnsChecks domain={settings.domain} />

        <section className="yop-card" aria-labelledby="yop-maillog-title">
          <div className="yop-card__head">
            <h2 id="yop-maillog-title">{m.logTitle}</h2>
            <span className="yop-card__sub">{m.logHint}</span>
          </div>
          {entries.length ? (
            <div className="yop-table-wrap">
              <table className="yop-table yop-ops-table">
                <thead>
                  <tr>
                    <th scope="col">{m.colTime}</th>
                    <th scope="col">{m.colTemplate}</th>
                    <th scope="col">{m.colRecipient}</th>
                    <th scope="col">{m.colStatus}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <bdi>{formatDateTime(entry.createdAt, language)}</bdi>
                      </td>
                      <td>{mailText(m, `template_${entry.template}`, entry.template)}</td>
                      <td>
                        <code dir="ltr">{entry.recipient}</code>
                      </td>
                      <td>
                        <StatePill tone={DELIVERY_TONE[entry.status]}>
                          {mailText(m, `delivery_${entry.status}`, entry.status)}
                        </StatePill>
                        {entry.errorCode ? (
                          <span className="yop-list__meta" dir="ltr">
                            {entry.errorCode}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="yop-empty yop-empty--padded">{m.logEmpty}</p>
          )}
        </section>

        <div className="yop-grid yop-grid--main">
          <section className="yop-card" aria-labelledby="yop-templates-title">
            <div className="yop-card__head">
              <h2 id="yop-templates-title">{m.templatesTitle}</h2>
              <span className="yop-card__sub">{m.templatesHint}</span>
            </div>
            <ul className="yop-mail-templates">
              {previews().map(({ template, mail }) => (
                <li key={template}>
                  <details>
                    <summary>
                      <Icon name="mail" />
                      <span>
                        <strong>{mailText(m, `template_${template}`, template)}</strong>
                        <span className="yop-list__meta">
                          {m.to}: {mailText(m, `recipient_${template}`, '')}
                        </span>
                      </span>
                      <span className="yop-mail-templates__preview">{m.preview}</span>
                    </summary>
                    <div className="yop-mail-preview">
                      <p>
                        <strong>{m.subject}:</strong> <span dir="auto">{mail.subject}</span>
                      </p>
                      <pre dir="auto">{mail.text}</pre>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
          <section className="yop-card" aria-labelledby="yop-addresses-title">
            <div className="yop-card__head">
              <h2 id="yop-addresses-title">{m.addressesTitle}</h2>
            </div>
            <dl className="yop-facts yop-facts--single">
              <div>
                <dt>{m.sender}</dt>
                <dd dir="ltr">
                  {settings.fromAddress ? `${settings.fromName} <${settings.fromAddress}>` : '—'}
                </dd>
              </div>
              <div>
                <dt>{m.notifyAddress}</dt>
                <dd dir="ltr">{settings.notifyAddress ?? '—'}</dd>
              </div>
              <div>
                <dt>{m.technicalAddress}</dt>
                <dd dir={settings.technicalAddress ? 'ltr' : undefined}>
                  {settings.technicalAddress ?? m.technicalNone}
                </dd>
              </div>
              <div>
                <dt>{m.password}</dt>
                <dd>{settings.passwordSet ? m.passwordSet : m.passwordMissing}</dd>
              </div>
            </dl>
            <p className="yop-hint yop-ops-footnote">
              <Icon name="info" />
              {m.mailboxesNote}
            </p>
          </section>
        </div>
      </div>
    </OpsTemplate>
  )
}
