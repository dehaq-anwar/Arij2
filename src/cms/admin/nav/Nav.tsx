import { getTranslation } from '@payloadcms/translations'
import type { PayloadRequest, ServerProps, VisibleEntities } from 'payload'

import { roleLabels } from '../../access/labels'
import { can, isRole, type PermissionSubject } from '../../access/permissions'
import { adminLanguage, adminTexts } from '../i18n'
import type { IconName } from '../icons'
import { NavClient, type NavGroupData, type NavItemData } from './NavClient'

const COLLECTION_ICONS: Record<string, IconName> = {
  pages: 'pages',
  projects: 'projects',
  news: 'news',
  events: 'calendar',
  redirects: 'arrow',
  'focus-areas': 'focus',
  'team-members': 'team',
  statistics: 'chart',
  partners: 'partners',
  media: 'media',
  'membership-applications': 'apps',
  members: 'members',
  'contact-messages': 'inbox',
  exports: 'register',
  'processing-purposes': 'check',
  'legal-bases': 'info',
  users: 'users',
  'audit-log': 'audit',
}

const GROUPS = [
  {
    key: 'content',
    collections: [
      'projects',
      'news',
      'events',
      'focus-areas',
      'team-members',
      'statistics',
      'partners',
      'media',
    ],
  },
  // The page builder's pages, then the site-wide texts (menu, forms, legal pages, settings).
  { key: 'pages', collections: ['pages'], globals: true, after: ['redirects'] },
  {
    key: 'association',
    collections: [
      'membership-applications',
      'members',
      'contact-messages',
      'exports',
      'processing-purposes',
      'legal-bases',
    ],
  },
  { key: 'security', collections: ['users', 'audit-log'] },
] as const

const GLOBAL_ICONS: Record<string, IconName> = {
  navigation: 'menu',
  'form-texts': 'check',
  'legal-notice': 'info',
  'privacy-policy': 'shield',
  'site-settings': 'settings',
}

/** Globals that are settings of the Control Center, not page texts of the website. */
const SETTINGS_GLOBALS: string[] = ['control-center-settings']

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
        where: { status: { in: ['received', 'inReview'] } },
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
        {
          id: 'nav-notifications',
          href: '/admin/notifications',
          label: t.notifications,
          icon: 'bell',
          exact: true,
        },
      ],
    },
  ]
  const collectionItems = (slugs: readonly string[]): NavItemData[] =>
    slugs.filter(readable).map((slug) => {
      const collection = payload.collections[slug as keyof typeof payload.collections]?.config
      return {
        id: `nav-${slug}`,
        href: `/admin/collections/${slug}`,
        label: getTranslation(collection?.labels?.plural ?? slug, i18n),
        icon: COLLECTION_ICONS[slug] ?? 'pages',
        badge: counts[slug] || undefined,
      }
    })
  for (const group of GROUPS) {
    const items: NavItemData[] = collectionItems(group.collections)
    if ('globals' in group) {
      items.push(
        ...payload.config.globals
          .filter(
            (global) =>
              visible.globals.includes(global.slug) && !SETTINGS_GLOBALS.includes(global.slug),
          )
          .map((global) => ({
            id: `nav-global-${global.slug}`,
            href: `/admin/globals/${global.slug}`,
            label: getTranslation(global.label, i18n),
            icon: GLOBAL_ICONS[global.slug] ?? ('pages' as IconName),
          })),
        ...collectionItems(group.after),
      )
    }
    if (group.key === 'association' && can(person, 'personalData.export')) {
      const at = items.findIndex((item) => item.id === 'nav-exports')
      items.splice(at === -1 ? items.length : at, 0, {
        id: 'nav-export',
        href: '/admin/export',
        label: t.navExport,
        icon: 'download',
        badge: undefined,
      })
    }
    if (group.key === 'security') {
      for (const slug of SETTINGS_GLOBALS) {
        const global = payload.config.globals.find((g) => g.slug === slug)
        if (global && (visible.globals as string[]).includes(slug)) {
          items.push({
            id: `nav-global-${slug}`,
            href: `/admin/globals/${slug}`,
            label: getTranslation(global.label, i18n),
            icon: 'settings',
            badge: undefined,
          })
        }
      }
    }
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
