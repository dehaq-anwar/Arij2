import type { Payload, PayloadRequest } from 'payload'

const MINUTE = 60_000
const BUCKET = 5 * MINUTE

export type StoredSample = {
  at: string
  cpuPercent?: number | null
  memoryUsed?: number | null
  memoryTotal?: number | null
  diskUsed?: number | null
  diskTotal?: number | null
  databaseBytes?: number | null
}

export type Series = { t: string; v: number | null }[]

/**
 * The last 24 hours of host samples as 5-minute averages, one slot per 5 minutes (null where
 * nothing was measured, so gaps stay visible). Memory and disk as percentages of their total.
 */
export function bucketSamples(samples: StoredSample[], now: Date, hours = 24) {
  const end = Math.floor(now.getTime() / BUCKET) * BUCKET
  const start = end - hours * 60 * MINUTE
  const slots = new Map<number, StoredSample[]>()
  for (const sample of samples) {
    const at = new Date(sample.at).getTime()
    if (at < start || at >= end + BUCKET) continue
    const slot = Math.floor(at / BUCKET) * BUCKET
    slots.set(slot, [...(slots.get(slot) ?? []), sample])
  }
  const avg = (values: (number | null | undefined)[]) => {
    const numbers = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    return numbers.length ? numbers.reduce((sum, v) => sum + v, 0) / numbers.length : null
  }
  const share = (used: number | null | undefined, total: number | null | undefined) =>
    used != null && total ? (used / total) * 100 : null
  const cpu: Series = []
  const memory: Series = []
  const disk: Series = []
  for (let slot = start + BUCKET; slot <= end; slot += BUCKET) {
    const inSlot = slots.get(slot) ?? []
    const t = new Date(slot).toISOString()
    cpu.push({ t, v: avg(inSlot.map((s) => s.cpuPercent)) })
    memory.push({ t, v: avg(inSlot.map((s) => share(s.memoryUsed, s.memoryTotal))) })
    disk.push({ t, v: avg(inSlot.map((s) => share(s.diskUsed, s.diskTotal))) })
  }
  return { cpu, memory, disk }
}

export async function recentSamples(payload: Payload, now: Date, req?: PayloadRequest) {
  const { docs } = await payload.find({
    collection: 'ops-samples',
    where: { at: { greater_than: new Date(now.getTime() - 24 * 60 * MINUTE).toISOString() } },
    sort: 'at',
    limit: 2000,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    ...(req ? { req } : {}),
  })
  return docs as unknown as StoredSample[]
}

/** Scheduled tasks shown on the status screen, in this order. */
export const SCHEDULED_TASKS = [
  'ops-collect',
  'retention',
  'auth-cleanup',
  'audit-retention',
  'notifications-retention',
  'ops-retention',
  'membership-reminders',
  'schedulePublish',
] as const

export type TaskRun = {
  task: string
  completedAt: string | null
  ok: boolean | null
  output: Record<string, unknown> | null
}

type Job = {
  completedAt?: string | null
  hasError?: boolean | null
  log?: { state?: string; output?: unknown }[] | null
}

/** The newest finished run of each task (finished jobs are kept 30 days). */
export async function lastTaskRuns(payload: Payload, req?: PayloadRequest): Promise<TaskRun[]> {
  return Promise.all(
    SCHEDULED_TASKS.map(async (task) => {
      const { docs } = await payload.find({
        collection: 'payload-jobs',
        where: {
          and: [
            { taskSlug: { equals: task } },
            { or: [{ completedAt: { exists: true } }, { hasError: { equals: true } }] },
          ],
        },
        sort: '-updatedAt',
        limit: 1,
        depth: 0,
        overrideAccess: true,
        ...(req ? { req } : {}),
      })
      const job = docs[0] as Job | undefined
      if (!job) return { task, completedAt: null, ok: null, output: null }
      const entry = job.log?.at(-1)
      return {
        task,
        completedAt: job.completedAt ?? null,
        ok: !job.hasError && entry?.state !== 'failed',
        output: (entry?.output as Record<string, unknown> | undefined) ?? null,
      }
    }),
  )
}
