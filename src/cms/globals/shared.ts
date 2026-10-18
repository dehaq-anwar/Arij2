import type { GlobalConfig } from 'payload'

import { isEditor } from '../access/roles'
import { revalidateGlobal } from '../hooks/revalidate'
import { groups } from '../lib/labels'

/** Common settings for the page globals: public read, editors write, revalidate on change. */
export const pageGlobal = (config: Omit<GlobalConfig, 'access' | 'hooks'>): GlobalConfig => ({
  ...config,
  admin: { group: groups.pages, ...config.admin },
  access: { read: () => true, update: isEditor },
  hooks: { afterChange: [revalidateGlobal] },
})
