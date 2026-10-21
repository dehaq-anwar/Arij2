import { readFile, statfs } from 'node:fs/promises'

/**
 * Host load, read once a minute: CPU from /proc/stat (inside a container this file shows the
 * whole host), memory from /proc/meminfo, load average from /proc/loadavg, disk from the file
 * system that holds the agent's data volume (the host's Docker disk). Nothing else of the host
 * is mounted or read.
 */
export type Sample = {
  at: string
  cpuPercent: number | null
  memoryUsedBytes: number
  memoryTotalBytes: number
  load1: number
  diskUsedBytes: number
  diskTotalBytes: number
}

export type CpuTimes = { idle: number; total: number }

export function parseCpu(stat: string): CpuTimes | null {
  const line = stat.split('\n').find((l) => l.startsWith('cpu '))
  if (!line) return null
  const values = line.trim().split(/\s+/).slice(1).map(Number)
  if (values.some((v) => !Number.isFinite(v))) return null
  // idle + iowait count as idle.
  const idle = (values[3] ?? 0) + (values[4] ?? 0)
  const total = values.reduce((sum, v) => sum + v, 0)
  return { idle, total }
}

export function cpuPercent(previous: CpuTimes | null, current: CpuTimes | null): number | null {
  if (!previous || !current) return null
  const total = current.total - previous.total
  const idle = current.idle - previous.idle
  if (total <= 0) return null
  return Math.round(((total - idle) / total) * 1000) / 10
}

export function parseMemory(meminfo: string): { used: number; total: number } {
  const value = (key: string) => {
    const match = meminfo.match(new RegExp(`^${key}:\\s+(\\d+)\\s+kB`, 'm'))
    return match ? Number(match[1]) * 1024 : 0
  }
  const total = value('MemTotal')
  const available = value('MemAvailable')
  return { used: Math.max(0, total - available), total }
}

export class Sampler {
  private samples: Sample[] = []
  private previous: CpuTimes | null = null
  private timer: NodeJS.Timeout | null = null

  private readonly diskPath: string
  private readonly proc: string
  private readonly keep: number

  constructor(diskPath: string, proc = '/proc', keep = 180) {
    this.diskPath = diskPath
    this.proc = proc
    this.keep = keep
  }

  async sample(now = new Date()): Promise<Sample> {
    const [stat, meminfo, loadavg] = await Promise.all([
      readFile(`${this.proc}/stat`, 'utf8').catch(() => ''),
      readFile(`${this.proc}/meminfo`, 'utf8').catch(() => ''),
      readFile(`${this.proc}/loadavg`, 'utf8').catch(() => ''),
    ])
    const cpu = parseCpu(stat)
    const memory = parseMemory(meminfo)
    let diskUsed = 0
    let diskTotal = 0
    try {
      const fs = await statfs(this.diskPath)
      diskTotal = fs.blocks * fs.bsize
      diskUsed = (fs.blocks - fs.bfree) * fs.bsize
    } catch {
      // No data volume (e.g. tests): disk stays unknown (0).
    }
    const sample: Sample = {
      at: now.toISOString(),
      cpuPercent: cpuPercent(this.previous, cpu),
      memoryUsedBytes: memory.used,
      memoryTotalBytes: memory.total,
      load1: Number(loadavg.split(' ')[0]) || 0,
      diskUsedBytes: diskUsed,
      diskTotalBytes: diskTotal,
    }
    this.previous = cpu
    this.samples.push(sample)
    if (this.samples.length > this.keep) this.samples.splice(0, this.samples.length - this.keep)
    return sample
  }

  since(iso: string | null): Sample[] {
    if (!iso) return [...this.samples]
    return this.samples.filter((s) => s.at > iso)
  }

  start(intervalMs = 60_000) {
    void this.sample()
    this.timer = setInterval(() => void this.sample(), intervalMs)
    this.timer.unref()
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
  }
}
