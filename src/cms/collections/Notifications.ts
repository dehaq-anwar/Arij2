import type { Access, CollectionConfig } from 'payload'

import { nobody } from '../access/roles'
import { isVerifiedSession } from '../auth/session-state'
import { label } from '../lib/labels'
import { NOTIFICATION_KINDS, NOTIFICATION_SUBJECTS } from '../membership/notifications'
import { notificationEndpoints } from '../membership/notification-endpoints'

/** Everyone reads their own notifications, nobody anyone else's. */
const ownOnly: Access = async ({ req }) => {
  if (!req.user || !(await isVerifiedSession(req))) return false
  return { recipient: { equals: req.user.id } }
}

/**
 * In-app notifications (src/cms/membership/notifications.ts): no personal data, only a kind,
 * a reference and a link. Created by the server; read and marked as read by their recipient
 * through the endpoints below.
 */
export const Notifications: CollectionConfig = {
  slug: 'notifications',
  labels: {
    singular: label('Benachrichtigung', 'Notification', 'إشعار'),
    plural: label('Benachrichtigungen', 'Notifications', 'الإشعارات'),
  },
  admin: { hidden: true },
  defaultSort: '-createdAt',
  lockDocuments: false,
  access: { read: ownOnly, create: nobody, update: nobody, delete: nobody },
  endpoints: notificationEndpoints,
  fields: [
    { name: 'recipient', type: 'relationship', relationTo: 'users', required: true, index: true },
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: NOTIFICATION_KINDS.map((value) => ({ value, label: value })),
    },
    {
      name: 'subjectType',
      type: 'select',
      required: true,
      options: NOTIFICATION_SUBJECTS.map((value) => ({ value, label: value })),
    },
    { name: 'subjectId', type: 'text' },
    { name: 'href', type: 'text', required: true },
    { name: 'readAt', type: 'date', index: true },
  ],
}
