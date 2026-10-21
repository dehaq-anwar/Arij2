import type { DefaultServerCellComponentProps, Payload } from 'payload'
import { cache } from 'react'

const nameOf = cache(async (payload: Payload, id: number) => {
  const account = await payload
    .findByID({
      collection: 'users',
      id,
      depth: 0,
      overrideAccess: true,
      select: { name: true },
    })
    .catch(() => null)
  return (account?.name as string | undefined) ?? null
})

/**
 * "Assigned to" in the lists: the name, read on the server, so people who may not open the
 * accounts list (users.read) still see who is assigned instead of a bare number.
 */
export async function AssigneeCell({ cellData, payload }: DefaultServerCellComponentProps) {
  const raw =
    cellData && typeof cellData === 'object' ? (cellData as { id?: unknown }).id : cellData
  const id = Number(raw)
  const name = raw != null && Number.isInteger(id) ? await nameOf(payload, id) : null
  return name ? <bdi>{name}</bdi> : <span>—</span>
}
