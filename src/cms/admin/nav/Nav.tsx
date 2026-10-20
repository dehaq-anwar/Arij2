import { getTranslation } from '@payloadcms/translations'
import type { PayloadRequest, ServerProps, VisibleEntities } from 'payload'

import { roleLabels } from '../../access/labels'
import { can, isRole, type PermissionSubject } from '../../access/permissions'
import { adminLanguage, adminTexts } from '../i18n'
import type { IconName } from '../icons'
import { NavClient, type NavGroupData } from './NavClient'

const COLLECTION_ICONS: Record<string, IconName> = {
  projects: 'projects',
  news: 'news',
  'focus-areas': 'focus',
  'team-members': 'team',
  statistics: 'chart',
  partners: 'partners',
  media: 'media',
  'membership-applications': 'apps',
  'contact-messages': 'inbox',
  users: 'users',
  'audit-log': 'audit',
}

const GROUPS = [
  {
    key: 'content',
    collections: [
      'projects',
      'news',
      'focus-areas',
      'team-members',
      'statistics',
      'partners',
      'media',
    ],
  },
  { key: 'pages', globals: true },
  { key: 'association', collections: ['membership-applications', 'contact-messages'] },
  { key: 'security', collections: ['users', 'audit-log'] },
] as const

type Props = ServerProps & { visibleEntities?: VisibleEntities; req?: PayloadRequest }

/**
 * The Control Center's navigation (replaces Payload's): grouped like the approved design, with
 * icons, and with live counts of open applications and new messages for those who may see them.
 * Only entries the person can read appear (Payload's visibleEntities and permissions).
 */
export async function Nav(props: Props) {
  const { i18n, payload, permissions, user, visibleEntities } = props
  if (!payload?.config || !user) return null
  const language = adminLanguage(i18n?.language)
  const t = adminTexts[language]
  const person = user as unknown as PermissionSubject & { name?: string; role?: string }
  const visible = visibleEntities ?? { collections: [], globals: [] }
  const readable = (slug: string) =>
    visible.collections.includes(slug as (typeof visible.collections)[number]) &&
    Boolean(
      (permissions?.collections as Record<string, { read?: boolean }> | undefined)?.[slug]?.read,
    )

  const counts: Record<string, number> = {}
  if (can(person, 'inbox.read')) {
    const [applications, messages] = await Promise.all([
      payload.count({
        collection: 'membership-applications',
        where: { status: { equals: 'received' } },
        overrideAccess: true,
      }),
      payload.count({
        collection: 'contact-messages',
        where: { status: { equals: 'new' } },
        overrideAccess: true,
      }),
    ])
    counts['membership-applications'] = applications.totalDocs
    counts['contact-messages'] = messages.totalDocs
  }

  const groupLabel = {
    content: t.navContent,
    pages: t.navPages,
    association: t.navAssociation,
    security: t.navSecurity,
  }
  const groups: NavGroupData[] = [
    {
      key: 'overview',
      label: t.navOverview,
      items: [
        { id: 'nav-dashboard', href: '/admin', label: t.dashboard, icon: 'home', exact: true },
        { id: 'nav-security', href: '/admin/security', label: t.mySecurity, icon: 'key' },
      ],
    },
  ]
  for (const group of GROUPS) {
    const items =
      'globals' in group
        ? payload.config.globals
            .filter((global) => visible.globals.includes(global.slug))
            .map((global) => ({
              id: `nav-global-${global.slug}`,
              href: `/admin/globals/${global.slug}`,
              label: getTranslation(global.label, i18n),
              icon: 'pages' as IconName,
            }))
        : group.collections.filter(readable).map((slug) => {
            const collection = payload.collections[slug as keyof typeof payload.collections]?.config
            return {
              id: `nav-${slug}`,
              href: `/admin/collections/${slug}`,
              label: getTranslation(collection?.labels?.plural ?? slug, i18n),
              icon: COLLECTION_ICONS[slug] ?? 'pages',
              badge: counts[slug] || undefined,
            }
          })
    if (items.length) groups.push({ key: group.key, label: groupLabel[group.key], items })
  }

  return (
    <NavClient
      groups={groups}
      person={{
        name: person.name ?? '',
        role: isRole(person.role) ? getTranslation(roleLabels[person.role], i18n) : '',
      }}
      texts={{
        controlCenter: t.controlCenter,
        closeNavigation: t.closeNavigation,
        association: t.association,
      }}
    />
  )
}
