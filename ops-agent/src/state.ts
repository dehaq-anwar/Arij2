import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/**
 * What the agent did (backups, restore drills, restarts), kept in its data volume so that the
 * Control Center can collect it even after a restart, and what each backup contained (table row
 * counts, the newest migration, the database triggers, the number of media files) so that the
 * restore drill can compare.
 */
export type EventKind = 'backup' | 'drill' | 'restart'

export type AgentEvent = {
  id: string
  kind: EventKind
  trigger: 'schedule' | 'manual'
  startedAt: string
  finishedAt: string
  ok: boolean
  /** Counts, durations, snapshot ids, problems — never personal data or secrets. */
  detail: Record<string, unknown>
}

export type SnapshotMeta = {
  snapshotId: string
  takenAt: string
  tables: Record<string, number>
  migration: string | null
  triggers: string[]
  mediaSnapshotId: string | null
  mediaFiles: number | null
}

type State = { events: AgentEvent[]; snapshots: SnapshotMeta[] }

const MAX_EVENTS = 500
const MAX_SNAPSHOTS = 60

export class StateStore {
  private state: State = { events: [], snapshots: [] }
  private writing: Promise<void> = Promise.resolve()

  private readonly file: string

  constructor(file: string) {
    this.file = file
  }

  async load() {
    try {
      const parsed = JSON.parse(await readFile(this.file, 'utf8')) as Partial<State>
      this.state = {
        events: Array.isArray(parsed.events) ? parsed.events : [],
        snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
      }
    } catch {
      this.state = { events: [], snapshots: [] }
    }
  }

  /** Writes to a temporary file and renames it, so a crash never leaves half a file. */
  private persist(): Promise<void> {
    this.writing = this.writing.then(async () => {
      await mkdir(dirname(this.file), { recursive: true })
      const temporary = `${this.file}.${process.pid}.tmp`
      await writeFile(temporary, JSON.stringify(this.state), { mode: 0o600 })
      await rename(temporary, this.file)
    })
    return this.writing
  }

  async record(event: Omit<AgentEvent, 'id'>): Promise<AgentEvent> {
    const full = { id: randomUUID(), ...event }
    this.state.events.push(full)
    if (this.state.events.length > MAX_EVENTS)
      this.state.events.splice(0, this.state.events.length - MAX_EVENTS)
    await this.persist()
    return full
  }

  async remember(meta: SnapshotMeta) {
    this.state.snapshots = this.state.snapshots.filter((s) => s.snapshotId !== meta.snapshotId)
    this.state.snapshots.push(meta)
    if (this.state.snapshots.length > MAX_SNAPSHOTS) {
      this.state.snapshots.splice(0, this.state.snapshots.length - MAX_SNAPSHOTS)
    }
    await this.persist()
  }

  snapshot(id: string): SnapshotMeta | undefined {
    return this.state.snapshots.find((s) => s.snapshotId === id)
  }

  events(since: string | null): AgentEvent[] {
    return since ? this.state.events.filter((e) => e.finishedAt > since) : [...this.state.events]
  }

  last(kind: EventKind, onlyScheduled = false): AgentEvent | undefined {
    return [...this.state.events]
      .reverse()
      .find((e) => e.kind === kind && (!onlyScheduled || e.trigger === 'schedule'))
  }
}
