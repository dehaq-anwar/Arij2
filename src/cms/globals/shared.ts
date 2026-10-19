import type { GlobalConfig, TextareaField } from 'payload'

import { isEditor } from '../access/roles'
import { revalidateGlobal } from '../hooks/revalidate'
import { groups, type AdminLabel } from '../lib/labels'

/** Common settings for the page globals: public read, editors write, revalidate on change. */
export const pageGlobal = (config: Omit<GlobalConfig, 'access' | 'hooks'>): GlobalConfig => ({
  ...config,
  admin: { group: groups.pages, ...config.admin },
  access: { read: () => true, update: isEditor },
  hooks: { afterChange: [revalidateGlobal] },
})

/** A short, localised form text (label of a checkbox, a hint). */
export const formText = (name: string, text: AdminLabel): TextareaField => ({
  name,
  type: 'textarea',
  localized: true,
  maxLength: 600,
  label: text,
  admin: { rows: 3 },
})
