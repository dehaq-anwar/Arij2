/**
 * Related documents the visitor may see. Relationships that were not populated (because the
 * related document is unpublished or not public) come back as plain IDs or null and are dropped.
 */
export const populated = <T extends object>(items: (number | T | null)[] | null | undefined): T[] =>
  (items ?? []).filter((item): item is T => typeof item === 'object' && item !== null)
