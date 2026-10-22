import type { GlobalConfig, TextareaField } from 'payload'

import { allow } from '../access/roles'
import { hiddenWithoutContent } from '../collections/content-access'
import { revalidateGlobal } from '../hooks/revalidate'
import { groups, type AdminLabel } from '../lib/labels'

/** Common settings for the page globals: public read, editors write, revalidate on change. */
export const pageGlobal = (config: Omit<GlobalConfig, 'access' | 'hooks'>): GlobalConfig => ({
  ...config,
  admin: { group: groups.pages, hidden: hiddenWithoutContent, ...config.admin },
  access: {
    read: () => true,
    // Earlier versions and drafts: for those who see content in full (Payload's default: anyone
    // signed in).
    readVersions: allow('content.read'),
    update: allow('content.write'),
  },
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
