import { spawn, type ChildProcessWithoutNullStreams, type SpawnOptions } from 'node:child_process'

import { maskLine } from './mask.ts'

/**
 * Running the agent's tools (restic, pg_dump, pg_restore, psql, rclone). Arguments never contain
 * secrets: connection details go into the child's environment (PG*, RESTIC_*, RCLONE_*). Error
 * output is masked before it is kept anywhere.
 */
export type RunResult = { code: number; stdout: string; stderr: string }

export class ToolError extends Error {
  readonly tool: string
  readonly code: number
  readonly stderr: string

  constructor(tool: string, code: number, stderr: string) {
    super(`${tool} exited with ${code}: ${lastLines(stderr)}`)
    this.tool = tool
    this.code = code
    this.stderr = stderr
  }
}

export const lastLines = (text: string, count = 3) =>
  text
    .split('\n')
    .map((line) => maskLine(line.trim()))
    .filter(Boolean)
    .slice(-count)
    .join(' | ')
    .slice(0, 600)

export function run(
  command: string,
  args: string[],
  options: { env?: NodeJS.ProcessEnv; input?: string; timeoutMs?: number } = {},
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const spawnOptions: SpawnOptions = { env: options.env ?? process.env, stdio: 'pipe' }
    const child = spawn(command, args, spawnOptions)
    const out: Buffer[] = []
    const err: Buffer[] = []
    let errSize = 0
    child.stdout?.on('data', (chunk: Buffer) => out.push(chunk))
    child.stderr?.on('data', (chunk: Buffer) => {
      errSize += chunk.length
      if (errSize < 256 * 1024) err.push(chunk)
    })
    const timer = setTimeout(() => child.kill('SIGTERM'), options.timeoutMs ?? 60 * 60 * 1000)
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({
        code: code ?? 1,
        stdout: Buffer.concat(out).toString('utf8'),
        stderr: Buffer.concat(err).toString('utf8'),
      })
    })
    if (options.input !== undefined) child.stdin?.end(options.input)
    else child.stdin?.end()
  })
}

/** Like `run`, but a non-zero exit is an error. */
export async function runOk(
  command: string,
  args: string[],
  options: Parameters<typeof run>[2] = {},
): Promise<RunResult> {
  const result = await run(command, args, options)
  if (result.code !== 0) throw new ToolError(command, result.code, result.stderr)
  return result
}

/** `first | second`, both checked: the pipe fails if either side fails. */
export function pipe(
  first: [string, string[], NodeJS.ProcessEnv],
  second: [string, string[], NodeJS.ProcessEnv],
  timeoutMs = 60 * 60 * 1000,
): Promise<{ first: RunResult; second: RunResult }> {
  return new Promise((resolve, reject) => {
    const a = spawn(first[0], first[1], { env: first[2], stdio: ['ignore', 'pipe', 'pipe'] })
    const b = spawn(second[0], second[1], { env: second[2], stdio: ['pipe', 'pipe', 'pipe'] })
    a.stdout?.pipe(b.stdin!)
    const collect = () => {
      const out: Buffer[] = []
      const err: Buffer[] = []
      return { out, err }
    }
    const ca = collect()
    const cb = collect()
    a.stderr?.on('data', (c: Buffer) => ca.err.length < 1000 && ca.err.push(c))
    b.stdout?.on('data', (c: Buffer) => cb.out.length < 1000 && cb.out.push(c))
    b.stderr?.on('data', (c: Buffer) => cb.err.length < 1000 && cb.err.push(c))
    let codeA: number | null = null
    let codeB: number | null = null
    const timer = setTimeout(() => {
      a.kill('SIGTERM')
      b.kill('SIGTERM')
    }, timeoutMs)
    const finish = () => {
      if (codeA === null || codeB === null) return
      clearTimeout(timer)
      const result = {
        first: { code: codeA, stdout: '', stderr: Buffer.concat(ca.err).toString('utf8') },
        second: {
          code: codeB,
          stdout: Buffer.concat(cb.out).toString('utf8'),
          stderr: Buffer.concat(cb.err).toString('utf8'),
        },
      }
      if (codeA !== 0) reject(new ToolError(first[0], codeA, result.first.stderr))
      else if (codeB !== 0) reject(new ToolError(second[0], codeB, result.second.stderr))
      else resolve(result)
    }
    a.on('error', reject)
    b.on('error', reject)
    // A broken pipe on the reading side is reported by its own exit code.
    b.stdin?.on('error', () => undefined)
    a.on('close', (code) => {
      codeA = code ?? 1
      finish()
    })
    b.on('close', (code) => {
      codeB = code ?? 1
      finish()
    })
  })
}

/** PG* variables for a connection string, so that no password appears in a process list. */
export function pgEnv(url: string, base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const parsed = new URL(url)
  return {
    ...base,
    PGHOST: parsed.hostname,
    PGPORT: parsed.port || '5432',
    PGUSER: decodeURIComponent(parsed.username),
    PGPASSWORD: decodeURIComponent(parsed.password),
    PGDATABASE: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    PGSSLMODE: parsed.searchParams.get('sslmode') ?? base.PGSSLMODE ?? 'prefer',
    PGCONNECT_TIMEOUT: '10',
  }
}

/** Runs SQL through psql (no psqlrc, unaligned, tuples only, stop on the first error). */
export async function psql(
  bin: string,
  env: NodeJS.ProcessEnv,
  sql: string,
  database?: string,
): Promise<string[]> {
  const args = ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1']
  if (database) args.push('-d', database)
  const { stdout } = await runOk(bin, args, { env, input: sql, timeoutMs: 10 * 60 * 1000 })
  return stdout.split('\n').filter((line) => line.length > 0)
}

/**
 * An open psql session: commands are sent one at a time and their output read up to a marker.
 * Used to hold a transaction (and its exported snapshot) open while pg_dump runs.
 */
export class PsqlSession {
  private buffer = ''
  private waiting: { marker: string; resolve: (lines: string[]) => void } | null = null
  private failure: Error | null = null
  private counter = 0
  private readonly child: ChildProcessWithoutNullStreams

  constructor(bin: string, env: NodeJS.ProcessEnv) {
    this.child = spawn(bin, ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1'], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stderr = ''
    this.child.stderr?.on('data', (chunk: Buffer) => (stderr += chunk.toString('utf8')))
    this.child.stdout?.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString('utf8')
      this.check()
    })
    this.child.on('close', (code) => {
      this.failure = new ToolError('psql', code ?? 1, stderr)
      if (this.waiting) this.waiting.resolve([])
    })
  }

  private check() {
    if (!this.waiting) return
    const index = this.buffer.indexOf(this.waiting.marker)
    if (index < 0) return
    const output = this.buffer.slice(0, index)
    this.buffer = this.buffer.slice(index + this.waiting.marker.length)
    const { resolve } = this.waiting
    this.waiting = null
    resolve(output.split('\n').filter((line) => line.length > 0))
  }

  async query(sql: string): Promise<string[]> {
    if (this.failure) throw this.failure
    const marker = `__yop_end_${++this.counter}__`
    const lines = await new Promise<string[]>((resolve) => {
      this.waiting = { marker, resolve }
      this.child.stdin?.write(`${sql}\n\\echo ${marker}\n`)
      this.check()
    })
    if (this.failure) throw this.failure
    return lines
  }

  async close() {
    this.child.stdin?.end('\\q\n')
    await new Promise((resolve) => this.child.once('close', resolve))
  }
}
