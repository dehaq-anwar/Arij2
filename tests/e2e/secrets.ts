import { createHmac } from 'node:crypto'

/**
 * Authenticator secrets of the test accounts, derived from the run's random password: the
 * fixtures store them (encrypted) like a real enrolment, and the tests compute the same codes.
 * Exists only for the "_e2e" test database.
 */
export const testTotpSecret = (password: string, email: string) =>
  createHmac('sha256', password).update(`totp:${email}`).digest().subarray(0, 20)

/** Test accounts per worker (scripts/e2e-fixtures.ts). */
export const ROLE_ACCOUNTS = {
  superAdmin: 'E2E Super-Admin',
  boardAdmin: 'E2E Vorstand',
  contentEditor: 'E2E Redaktion',
  membershipManager: 'E2E Mitgliederverwaltung',
  technicalAdmin: 'E2E Technik',
  auditor: 'E2E Prüfung',
} as const

/** Accounts for single scenarios: name, role, second factor set up, deactivated. */
export const SCENARIO_ACCOUNTS = {
  ui: { name: 'E2E Anmeldung', role: 'contentEditor', enrolled: true },
  fresh: { name: 'E2E Neu', role: 'contentEditor', enrolled: false },
  recovery: { name: 'E2E Wiederherstellung', role: 'contentEditor', enrolled: true },
  reset: { name: 'E2E Passwort', role: 'contentEditor', enrolled: true },
  lockout: { name: 'E2E Sperre', role: 'contentEditor', enrolled: true },
  target: { name: 'E2E Zielkonto', role: 'contentEditor', enrolled: true },
  second: { name: 'E2E Zweitgerät', role: 'contentEditor', enrolled: true },
  disabled: { name: 'E2E Deaktiviert', role: 'contentEditor', enrolled: true },
  mfaTarget: { name: 'E2E Zurücksetzen', role: 'contentEditor', enrolled: true },
  spareAdmin: { name: 'E2E Zweite Super-Administration', role: 'superAdmin', enrolled: true },
} as const

export type AccountName = keyof typeof ROLE_ACCOUNTS | keyof typeof SCENARIO_ACCOUNTS

export const testEmail = (name: AccountName, worker: number) => `e2e-${name}-${worker}@example.test`

/** Written by the fixtures: recovery codes and password-reset tokens for the scenarios. */
export const STATE_FILE = '.e2e-state.json'
export type E2EState = {
  recoveryCodes: Record<string, string[]>
  resetTokens: Record<string, string>
}
