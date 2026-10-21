import type { SanitizedConfig, TaskConfig } from 'payload'

import { can, type PermissionSubject } from '../access/permissions'
import { audit, type AuditActor } from '../audit/log'

type Reference = { relationTo?: string; value?: number | string } | null | undefined
type Input = { type?: 'publish' | 'unpublish'; user?: Reference; doc?: Reference; global?: string }

/**
 * Payload's scheduled publication (drafts with "schedule publish") runs in the job queue as the
 * person who scheduled it. That person has no signed-in session there, so the access rules — which
 * accept only sessions confirmed with the second factor (src/cms/auth/session-state.ts) — would
 * refuse it. Instead of loosening those rules, this check runs first: the publication is carried
 * out only if the person who scheduled it still exists, is active and may still edit content
 * (scheduling is enabled only on content: pages, projects, news); then it runs without a person,
 * and the audit log names who scheduled it. Payload itself does not check permissions when a
 * publication is scheduled, so this check is also what keeps other roles from scheduling one.
 */
export function withCheckedSchedule(config: SanitizedConfig): SanitizedConfig {
  const tasks = (config.jobs?.tasks ?? []) as TaskConfig[]
  const index = tasks.findIndex((task) => task.slug === 'schedulePublish')
  if (index < 0) return config
  const original = tasks[index]!
  const handler = original.handler
  if (typeof handler !== 'function') return config

  tasks[index] = {
    ...original,
    handler: async (args) => {
      const input = (args.input ?? {}) as Input
      const reference = input.user
      const person =
        reference && typeof reference === 'object' && reference.relationTo === 'users'
          ? await args.req.payload
              .findByID({
                collection: 'users',
                id: reference.value as number,
                depth: 0,
                overrideAccess: true,
                req: args.req,
              })
              .catch(() => null)
          : null
      const target = input.doc
        ? { type: String(input.doc.relationTo), id: String(input.doc.value) }
        : input.global
          ? { type: 'globals', id: input.global }
          : undefined
      if (!person || !can(person as PermissionSubject, 'content.write')) {
        await audit(args.req.payload, {
          action: 'content.scheduleRefused',
          area: 'content',
          result: 'denied',
          actor: null,
          target,
          detail: { type: input.type ?? 'publish', scheduledBy: reference?.value ?? null },
        })
        throw new Error(
          'The person who scheduled this publication can no longer edit content; it was not carried out.',
        )
      }
      const result = await handler({ ...args, input: { ...input, user: undefined } } as never)
      await audit(args.req.payload, {
        action: 'content.scheduled',
        area: 'content',
        actor: person as unknown as AuditActor,
        target,
        detail: { type: input.type ?? 'publish' },
      })
      return result
    },
  } as TaskConfig
  return config
}
