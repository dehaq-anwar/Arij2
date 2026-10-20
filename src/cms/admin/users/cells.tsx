'use client'

import type { DefaultCellComponentProps } from 'payload'

import { useAdminText } from '../client'
import { Icon } from '../icons'

/** Accounts list: two-factor set up or still open. */
export function MfaCell({ cellData }: DefaultCellComponentProps) {
  const { t } = useAdminText()
  return cellData ? (
    <span className="yop-pill yop-pill--good">
      <Icon name="check" />
      {t.cellMfaOn}
    </span>
  ) : (
    <span className="yop-pill yop-pill--warning">
      <Icon name="clock" />
      {t.cellMfaOpen}
    </span>
  )
}

/** Accounts list: deactivated accounts stand out, active ones stay quiet. */
export function DisabledCell({ cellData }: DefaultCellComponentProps) {
  const { t } = useAdminText()
  return cellData ? (
    <span className="yop-pill yop-pill--warning">{t.cellDisabled}</span>
  ) : (
    <span>{t.cellActive}</span>
  )
}

/** Audit log: entries without a person came from the website or the system. */
export function ActorCell({ cellData }: DefaultCellComponentProps) {
  const { t } = useAdminText()
  return <span>{cellData ? String(cellData) : t.cellSystem}</span>
}

/** Audit log: entries without a target (e.g. a confirmation with a code) show a dash. */
export function TargetCell({ cellData }: DefaultCellComponentProps) {
  return cellData ? <bdi>{String(cellData)}</bdi> : <span>—</span>
}
