'use client'

import { StepUpSection, useAdminText } from '../client'

/** On the e-mail settings screen: saving needs a fresh code. */
export function SettingsStepUp() {
  const { t } = useAdminText()
  return <StepUpSection hint={t.mailSettingsStepUpHint} />
}
