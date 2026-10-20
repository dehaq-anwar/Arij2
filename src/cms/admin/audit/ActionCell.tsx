'use client'

import type { DefaultCellComponentProps } from 'payload'

import { useAdminText } from '../client'
import { actionLabel } from './actions'

/** The audit log list shows actions in words instead of their keys. */
export function ActionCell({ cellData }: DefaultCellComponentProps) {
  const { lang } = useAdminText()
  return <span title={String(cellData ?? '')}>{actionLabel(String(cellData ?? ''), lang)}</span>
}
