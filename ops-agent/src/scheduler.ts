/**
 * The agent's own schedule, independent of the website: the nightly backup and the weekly
 * restore drill run even when the app is down. Times are in the association's time zone.
 */
export type LocalTime = { date: string; weekday: number; time: string }

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function localTime(now: Date, timeZone: string): LocalTime {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  )
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WEEKDAYS.indexOf(parts.weekday ?? ''),
    time: `${parts.hour}:${parts.minute}`,
  }
}

export type ScheduledTask = {
  name: string
  /** Weekday (0 = Sunday) or null for every day. */
  weekday: number | null
  time: string
  run: () => Promise<unknown>
}

/** Checks twice a minute; a task runs once on its day and minute (a restart does not repeat it). */
export class Scheduler {
  private done = new Set<string>()
  private timer: NodeJS.Timeout | null = null

  private readonly tasks: ScheduledTask[]
  private readonly timeZone: string
  private readonly startedAt: Date

  constructor(tasks: ScheduledTask[], timeZone: string, startedAt = new Date()) {
    this.tasks = tasks
    this.timeZone = timeZone
    this.startedAt = startedAt
  }

  due(now: Date): ScheduledTask[] {
    const local = localTime(now, this.timeZone)
    return this.tasks.filter((task) => {
      if (task.time !== local.time) return false
      if (task.weekday !== null && task.weekday !== local.weekday) return false
      const key = `${task.name}@${local.date}`
      if (this.done.has(key)) return false
      // Not in the very minute the agent started (it may just have been restarted after a run).
      if (now.getTime() - this.startedAt.getTime() < 60_000) return false
      this.done.add(key)
      return true
    })
  }

  start(onError: (task: string, error: unknown) => void) {
    this.timer = setInterval(() => {
      for (const task of this.due(new Date())) {
        task.run().catch((error: unknown) => onError(task.name, error))
      }
    }, 30_000)
    this.timer.unref()
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
  }
}
