import type { AdminViewServerProps } from 'payload'

import { agentSetup, type CertificateStatus } from '../../operations/agent'
import { readOperationsState } from '../../operations/collect'
import { fill, formatDate, formatDateTime } from '../i18n'
import { Icon } from '../icons'
import { CertificatesButton } from './actions'
import {
  AgentNotice,
  allowedTo,
  NotAllowed,
  opsContext,
  OpsTemplate,
  PageHead,
  StatePill,
  type Tone,
} from './shared'
import type { OpsTexts } from './texts'

function certificateState(c: CertificateStatus, o: OpsTexts): [Tone, string] {
  if (c.error && !c.validTo) return ['bad', o.certError]
  if (!c.trusted || (c.daysLeft ?? 0) <= 0) return ['bad', o.certInvalid]
  if (!c.ok) return ['warning', o.certExpiring]
  return ['good', o.certOk]
}

/** The TLS certificates Caddy serves for the website and the Control Center, checked hourly. */
export async function DomainsView(props: AdminViewServerProps) {
  const ctx = await opsContext(props, '/admin/operations/domains')
  const { req, language, o } = ctx
  if (!allowedTo(ctx, 'operations.read')) {
    return (
      <OpsTemplate props={props}>
        <NotAllowed o={o} />
      </OpsTemplate>
    )
  }
  const setup = agentSetup()
  const state = await readOperationsState(req.payload, req)
  const certificates = state.certificates ?? []
  return (
    <OpsTemplate props={props}>
      <div className="yop-page yop-ops">
        <PageHead
          eyebrow={o.navOperations}
          title={o.domainsTitle}
          lead={o.domainsLead}
          icon="globe"
          actions={setup ? <CertificatesButton /> : null}
        />
        <AgentNotice
          configured={Boolean(setup)}
          reachable={Boolean(setup) && !state.failingSince}
          state={state}
          o={o}
          language={language}
        />
        <section className="yop-card" aria-labelledby="yop-certs-title">
          <div className="yop-card__head">
            <h2 id="yop-certs-title">TLS</h2>
            <span className="yop-card__sub">
              {state.certificatesCheckedAt
                ? fill(o.asOf, { time: formatDateTime(state.certificatesCheckedAt, language) })
                : o.noCertificates}
            </span>
          </div>
          {certificates.length ? (
            <div className="yop-table-wrap">
              <table className="yop-table yop-ops-table">
                <thead>
                  <tr>
                    <th scope="col">{o.colHost}</th>
                    <th scope="col">{o.colStatus}</th>
                    <th scope="col">{o.colValidTo}</th>
                    <th scope="col">{o.colDaysLeft}</th>
                    <th scope="col">{o.colIssuer}</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((certificate) => {
                    const [tone, word] = certificateState(certificate, o)
                    return (
                      <tr key={certificate.host}>
                        <th scope="row">
                          <code dir="ltr">{certificate.host}</code>
                        </th>
                        <td>
                          <StatePill tone={tone}>{word}</StatePill>
                          {certificate.error ? (
                            <span className="yop-list__meta" dir="ltr">
                              {certificate.error}
                            </span>
                          ) : null}
                        </td>
                        <td>
                          <bdi>{formatDate(certificate.validTo, language)}</bdi>
                        </td>
                        <td>
                          {certificate.daysLeft != null
                            ? fill(o.daysLeft, { n: certificate.daysLeft })
                            : '—'}
                        </td>
                        <td dir="ltr" className="yop-ops-issuer">
                          {certificate.issuer ?? '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="yop-empty yop-empty--padded">{setup ? o.noCertificates : o.notSetUp}</p>
          )}
          <p className="yop-hint yop-ops-footnote">
            <Icon name="info" />
            {o.certNote}
          </p>
        </section>
        <p className="yop-hint yop-ops-footnote">
          <Icon name="globe" />
          {o.dnsNote}
        </p>
      </div>
    </OpsTemplate>
  )
}
