import { APIError, type PayloadRequest } from 'payload'

import { label, localizedMessage, type AdminLabel } from './labels'

/** An error whose message is shown to the person in their admin language. */
export const refuse = (req: PayloadRequest, message: AdminLabel, status = 403) =>
  new APIError(localizedMessage(message, req), status, null, true)

export const STEP_UP_MESSAGE = label(
  'Bitte bestätigen Sie diese Änderung zuerst mit einem Code aus Ihrer Authenticator-App (Abschnitt „Sicherheitsbestätigung“).',
  'Please confirm this change first with a code from your authenticator app (section “Security confirmation”).',
  'يرجى تأكيد هذا التغيير أولًا برمز من تطبيق المصادقة (قسم «تأكيد الأمان»).',
)

export const NOT_ALLOWED = label(
  'Diese Änderung ist mit Ihrer Rolle nicht erlaubt.',
  'Your role does not allow this change.',
  'دورك لا يسمح بهذا التغيير.',
)
