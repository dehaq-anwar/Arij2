import { getTranslations } from 'next-intl/server'
import { cache } from 'react'

import type { Locale } from '@/i18n/routing'
import { menuEntry, type LinkValue, type MenuEntry } from '@/lib/links'
import { mainNav, membershipLink } from '@/lib/navigation'

import { getGlobal } from './queries'

/**
 * The website's menu from the "Navigation" global (CC-2), in the visitor's language. Until it is
 * first saved, and for entries whose target is gone, the website's usual menu stands in.
 */
export const getMenu = cache(
  async (locale: Locale): Promise<{ main: MenuEntry[]; cta: MenuEntry }> => {
    const t = await getTranslations({ locale, namespace: 'Navigation' })
    const fallback = {
      main: mainNav.map(({ href, key }) => ({
        id: href,
        label: t(key),
        href,
        external: false,
        match: href,
      })),
      cta: {
        id: 'cta',
        label: t(membershipLink.key),
        href: membershipLink.href,
        external: false,
        match: membershipLink.href,
      },
    }
    const nav = await getGlobal('navigation', locale)
    if (!nav.updatedAt) return fallback
    const main = (nav.main ?? [])
      .map((entry, i) => menuEntry(entry as LinkValue, entry.id ?? String(i)))
      .filter((entry): entry is MenuEntry => entry !== null)
    return {
      main: main.length ? main : fallback.main,
      cta: menuEntry(nav.cta as LinkValue, 'cta') ?? fallback.cta,
    }
  },
)
