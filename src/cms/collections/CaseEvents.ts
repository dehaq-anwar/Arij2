import type { Access, AccessResult, CollectionConfig } from 'payload'

import { allowed, nobody } from '../access/roles'
import { groups, label } from '../lib/labels'
import { CASE_EVENTS } from '../membership/events'

/** Application events for those who see applications, member events for those who see members. */
const readCaseEvents: Access = async ({ req }): Promise<AccessResult> => {
  const [applications, members] = await Promise.all([
    allowed(req, 'inbox.read'),
    allowed(req, 'members.read'),
  ])
  if (applications && members) return true
  if (applications) return { application: { exists: true } }
  if (members) return { member: { exists: true } }
  return false
}

/**
 * The case history of applications and members (src/cms/membership/events.ts). Written by the
 * server only, shown on the application or member; not editable or deletable by anyone.
 */
export const CaseEvents: CollectionConfig = {
  slug: 'case-events',
  labels: {
    singular: label('Verlaufseintrag', 'History entry', 'إدخال في السجل'),
    plural: label('Verlauf', 'History', 'السجل'),
  },
  admin: { hidden: true, group: groups.inbox },
  defaultSort: '-createdAt',
  lockDocuments: false,
  access: { read: readCaseEvents, create: nobody, update: nobody, delete: nobody },
  fields: [
    {
      name: 'event',
      type: 'select',
      required: true,
      options: CASE_EVENTS.map((value) => ({ value, label: value })),
      index: true,
    },
    {
      name: 'application',
      type: 'relationship',
      relationTo: 'membership-applications',
      index: true,
    },
    { name: 'member', type: 'relationship', relationTo: 'members', index: true },
    { name: 'from', type: 'text' },
    { name: 'to', type: 'text' },
    { name: 'actorId', type: 'number' },
    { name: 'actorName', type: 'text' },
    { name: 'detail', type: 'json' },
  ],
}
