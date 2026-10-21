import type {
  Endpoint,
  PayloadRequest,
  RelationshipField,
  RelationshipFieldSingleValidation,
} from 'payload'

import { can, type PermissionSubject } from '../access/permissions'
import { allowed } from '../access/roles'
import { label, localizedMessage } from '../lib/labels'

/**
 * Who an application or a contact message can be assigned to (CC-2 review of the assignment):
 * active accounts whose role, minus their restrictions, can read and work on the inbox. The
 * assignment is a to-do marker only — it grants no access: who may see an application or a
 * message is decided by the permissions alone (inbox.read), so assigning cannot open a record to
 * someone who may not see it, and a person whose access is taken away keeps no access through an
 * old assignment.
 *
 * The list of possible people comes from the server with id and name only (no e-mail, no role),
 * so people who may not read the accounts list (users.read) can still assign a colleague.
 */
export const ASSIGNABLE_COLLECTIONS = ['membership-applications', 'contact-messages'] as const

type Account = PermissionSubject & { id: number; name?: string | null }

export const canWorkOnInbox = (account: PermissionSubject) =>
  can(account, 'inbox.read') && can(account, 'inbox.write')

export type Assignee = { id: number; name: string }

/** Everyone who can be assigned, sorted by name. */
export async function assignees(req: PayloadRequest): Promise<Assignee[]> {
  const { docs } = await req.payload.find({
    collection: 'users',
    where: { disabled: { not_equals: true } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
    select: { name: true, role: true, restrictions: true, disabled: true },
    req,
  })
  return (docs as unknown as Account[])
    .filter(canWorkOnInbox)
    .map((account) => ({ id: account.id, name: account.name ?? '' }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

const idOf = (value: unknown): number | null => {
  const raw = value && typeof value === 'object' ? (value as { id?: unknown }).id : value
  const id = Number(raw)
  return raw == null || raw === '' || !Number.isInteger(id) ? null : id
}

const NOT_ASSIGNABLE = label(
  'Diese Person kann nicht zuständig sein: Sie hat keinen Zugang zu Anträgen und Nachrichten oder ihr Konto ist deaktiviert.',
  'This person cannot be assigned: they have no access to applications and messages, or their account is deactivated.',
  'لا يمكن إسناد المهمة إلى هذا الشخص: ليس لديه صلاحية الوصول إلى الطلبات والرسائل أو أن حسابه معطّل.',
)

/**
 * Checked on the server for every way in (form, API, Local API with a person): a new assignee must
 * be someone who can work on the inbox. An assignment that stays as it was is not checked again,
 * so a record can still be saved after the assigned person lost their access (the list shows it,
 * and it can be changed).
 */
export const validateAssignee: RelationshipFieldSingleValidation = async (
  value,
  { previousValue, req },
) => {
  const id = idOf(value)
  if (id === null || id === idOf(previousValue)) return true
  const account = (await req.payload
    .findByID({
      collection: 'users',
      id,
      depth: 0,
      overrideAccess: true,
      select: { role: true, restrictions: true, disabled: true },
      req,
    })
    .catch(() => null)) as Account | null
  return account && canWorkOnInbox(account) ? true : localizedMessage(NOT_ASSIGNABLE, req)
}

export const assigneeField = (): RelationshipField => ({
  name: 'assignedTo',
  type: 'relationship',
  relationTo: 'users',
  label: label('Zuständig', 'Assigned to', 'المسؤول'),
  validate: validateAssignee,
  admin: {
    position: 'sidebar',
    description: label(
      'Nur eine Aufgabe: Wer Anträge und Nachrichten sehen darf, bestimmt allein die Rolle.',
      'A to-do only: who may see applications and messages is decided by the role alone.',
      'للمتابعة فقط: من يحق له رؤية الطلبات والرسائل يحدده الدور وحده.',
    ),
    components: {
      Field: '/cms/admin/membership/AssigneeField#AssigneeField',
      Cell: '/cms/admin/membership/AssigneeCell#AssigneeCell',
    },
  },
})

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

/**
 * GET /api/<applications|messages>/assignees[?current=<id>] — for the assignment menu; only for
 * people who may change the assignment. `current` adds the name of the person assigned now if
 * they can no longer be assigned, so the menu can show who it is.
 */
async function list(req: PayloadRequest): Promise<Response> {
  if (!(await allowed(req, 'inbox.write'))) return json({ error: 'not_allowed' }, 403)
  const people = await assignees(req)
  const current = idOf(new URL(req.url ?? 'http://x').searchParams.get('current'))
  let former: Assignee | null = null
  if (current !== null && !people.some((person) => person.id === current)) {
    const account = await req.payload
      .findByID({
        collection: 'users',
        id: current,
        depth: 0,
        overrideAccess: true,
        select: { name: true },
        req,
      })
      .catch(() => null)
    if (account) former = { id: current, name: (account.name as string) ?? '' }
  }
  return json({ people, former })
}

export const assigneeEndpoints: Endpoint[] = [{ path: '/assignees', method: 'get', handler: list }]
