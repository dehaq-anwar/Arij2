import { can, type PermissionSubject } from '../access/permissions'

/** Content collections are not shown in the navigation of roles without content access. */
export const hiddenWithoutContent = ({ user }: { user: unknown }) =>
  !can(user as PermissionSubject, 'content.read')
