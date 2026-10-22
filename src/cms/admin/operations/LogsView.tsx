import type { AdminViewServerProps } from 'payload'

import { agentSetup } from '../../operations/agent'
import { readOperationsState } from '../../operations/collect'
import { LogsClient } from './LogsClient'
import { AgentNotice, allowedTo, NotAllowed, opsContext, OpsTemplate, PageHead } from './shared'
import { opsText } from './texts'

const DEFAULT_SERVICES = ['app', 'caddy', 'postgres', 'ops-agent', 'socket-proxy']

/** Masked log lines of the services, loaded on request (each request is in the audit log). */
export async function LogsView(props: AdminViewServerProps) {
  const ctx = await opsContext(props, '/admin/operations/logs')
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
  const services = state.status?.agent.services ?? DEFAULT_SERVICES
  return (
    <OpsTemplate props={props}>
      <div className="yop-page yop-ops">
        <PageHead eyebrow={o.navOperations} title={o.logsTitle} lead={o.logsLead} icon="logs" />
        <AgentNotice
          configured={Boolean(setup)}
          reachable={Boolean(setup) && !state.failingSince}
          state={state}
          o={o}
          language={language}
        />
        {setup ? (
          <LogsClient
            services={services.map((service) => ({
              value: service,
              label: opsText(o, `service_${service}`, service),
            }))}
          />
        ) : null}
      </div>
    </OpsTemplate>
  )
}
