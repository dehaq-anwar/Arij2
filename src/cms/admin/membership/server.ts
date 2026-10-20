import { headers } from 'next/headers'
import { createLocalReq, type Payload, type PayloadRequest } from 'payload'

import { isVerifiedSession } from '../../auth/session-state'

/**
 * A request for the signed-in person, for the Control Center's own views. Payload hands custom
 * list views no request object, so the session is read from the request's cookies the same way
 * the API does; the access rules then run exactly as for an API call (including the second
 * factor check of session-state.ts). Null when nobody is signed in with both factors.
 */
export async function adminRequest(payload: Payload): Promise<PayloadRequest | null> {
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return null
  const req = await createLocalReq({ user }, payload)
  return (await isVerifiedSession(req)) ? req : null
}

/** One value of a search parameter, if it is one of the allowed values. */
export function param<T extends string>(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  name: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = searchParams?.[name]
  const value = Array.isArray(raw) ? raw[0] : raw
  return allowed.includes(value as T) ? (value as T) : fallback
}

export function textParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  name: string,
): string {
  const raw = searchParams?.[name]
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' ? value.slice(0, 100) : ''
}

export function pageParam(searchParams: Record<string, string | string[] | undefined> | undefined) {
  const page = Number(textParam(searchParams, 'page'))
  return Number.isInteger(page) && page > 0 && page < 10_000 ? page : 1
}

/** Builds a list URL from the current parameters with some of them changed. */
export function listHref(
  base: string,
  current: Record<string, string>,
  changes: Record<string, string | null>,
) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries({ ...current, ...changes })) {
    if (value != null && value !== '') params.set(key, value)
  }
  const query = params.toString()
  return query ? `${base}?${query}` : base
}

/** Names of accounts (people assigned to applications); team names are not personal data here. */
export async function accountNames(payload: Payload, ids: (number | null | undefined)[]) {
  const unique = [...new Set(ids.filter((id): id is number => typeof id === 'number'))]
  if (!unique.length) return new Map<number, string>()
  const { docs } = await payload.find({
    collection: 'users',
    where: { id: { in: unique } },
    limit: unique.length,
    depth: 0,
    overrideAccess: true,
    select: { name: true },
  })
  return new Map(docs.map((doc) => [doc.id as number, (doc.name as string) ?? '']))
}

export const relationId = (value: unknown): number | null =>
  value && typeof value === 'object'
    ? Number((value as { id: number }).id)
    : value == null
      ? null
      : Number(value)
