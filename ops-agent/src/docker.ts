import { request } from 'node:http'

/**
 * The Docker Engine API, reached only through docker-socket-proxy (which allows the container
 * section, restarts and nothing else). The agent itself decides which containers it touches:
 * those of its own Compose project, by service name.
 */
export type ContainerStatus = {
  service: string
  name: string
  state: string
  status: string
  health: string | null
  startedAt: string | null
  image: string
  imageId: string
  restartCount: number | null
}

type DockerContainer = {
  Id: string
  Names?: string[]
  Image?: string
  ImageID?: string
  State?: string
  Status?: string
  Labels?: Record<string, string>
}

type Inspect = {
  State?: { StartedAt?: string; Health?: { Status?: string } }
  RestartCount?: number
}

export class DockerError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

export class DockerClient {
  private readonly baseUrl: string
  private readonly timeoutMs: number

  constructor(baseUrl: string, timeoutMs = 8000) {
    this.baseUrl = baseUrl
    this.timeoutMs = timeoutMs
  }

  private call(method: string, path: string): Promise<{ status: number; body: Buffer }> {
    const url = new URL(path, this.baseUrl)
    return new Promise((resolve, reject) => {
      const req = request(
        url,
        { method, timeout: this.timeoutMs, headers: { 'content-length': 0 } },
        (res) => {
          const chunks: Buffer[] = []
          let size = 0
          res.on('data', (chunk: Buffer) => {
            size += chunk.length
            // Logs are capped by `tail`; this only guards against a misbehaving endpoint.
            if (size > 8 * 1024 * 1024) req.destroy(new DockerError('response too large'))
            else chunks.push(chunk)
          })
          res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks) }))
        },
      )
      req.on('timeout', () => req.destroy(new DockerError('timeout')))
      req.on('error', reject)
      req.end()
    })
  }

  private async json<T>(path: string): Promise<T> {
    const { status, body } = await this.call('GET', path)
    if (status !== 200) throw new DockerError(`GET ${path.split('?')[0]}: ${status}`, status)
    return JSON.parse(body.toString('utf8')) as T
  }

  async ping(): Promise<boolean> {
    try {
      const { status } = await this.call('GET', '/_ping')
      return status === 200
    } catch {
      return false
    }
  }

  /** The project's containers, keyed by Compose service; services not listed are left out. */
  async containers(project: string, services: readonly string[]): Promise<ContainerStatus[]> {
    const filters = encodeURIComponent(
      JSON.stringify({ label: [`com.docker.compose.project=${project}`] }),
    )
    const list = await this.json<DockerContainer[]>(`/containers/json?all=1&filters=${filters}`)
    const shown = list.filter((c) =>
      services.includes(c.Labels?.['com.docker.compose.service'] ?? ''),
    )
    return Promise.all(
      shown.map(async (c) => {
        let inspect: Inspect = {}
        try {
          inspect = await this.json<Inspect>(`/containers/${encodeURIComponent(c.Id)}/json`)
        } catch {
          // The list alone is still useful.
        }
        return {
          service: c.Labels?.['com.docker.compose.service'] ?? '',
          name: (c.Names?.[0] ?? '').replace(/^\//, ''),
          state: c.State ?? 'unknown',
          status: c.Status ?? '',
          health: inspect.State?.Health?.Status ?? null,
          startedAt: inspect.State?.StartedAt ?? null,
          image: c.Image ?? '',
          imageId: c.ImageID ?? '',
          restartCount: typeof inspect.RestartCount === 'number' ? inspect.RestartCount : null,
        }
      }),
    )
  }

  private async idOf(project: string, service: string): Promise<string> {
    const filters = encodeURIComponent(
      JSON.stringify({
        label: [`com.docker.compose.project=${project}`, `com.docker.compose.service=${service}`],
      }),
    )
    const list = await this.json<DockerContainer[]>(`/containers/json?all=1&filters=${filters}`)
    const first = list[0]
    if (!first) throw new DockerError(`no container for service ${service}`, 404)
    return first.Id
  }

  /** The last `lines` log lines (stdout and stderr, with timestamps). */
  async logs(project: string, service: string, lines: number): Promise<string[]> {
    const id = await this.idOf(project, service)
    const { status, body } = await this.call(
      'GET',
      `/containers/${encodeURIComponent(id)}/logs?stdout=1&stderr=1&timestamps=1&tail=${lines}`,
    )
    if (status !== 200) throw new DockerError(`logs: ${status}`, status)
    return demultiplex(body)
      .split('\n')
      .filter((line) => line.trim().length > 0)
  }

  async restart(project: string, service: string): Promise<void> {
    const id = await this.idOf(project, service)
    const { status } = await this.call('POST', `/containers/${encodeURIComponent(id)}/restart?t=20`)
    if (status !== 204) throw new DockerError(`restart: ${status}`, status)
  }
}

/**
 * Containers without a terminal send their output in frames: one byte for the stream, three
 * zero bytes, the length (big-endian) and the payload. With a terminal the output is plain.
 */
export function demultiplex(buffer: Buffer): string {
  const framed =
    buffer.length >= 8 &&
    [0, 1, 2].includes(buffer[0] as number) &&
    buffer[1] === 0 &&
    buffer[2] === 0 &&
    buffer[3] === 0
  if (!framed) return buffer.toString('utf8')
  const parts: Buffer[] = []
  let offset = 0
  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset + 4)
    parts.push(buffer.subarray(offset + 8, offset + 8 + size))
    offset += 8 + size
  }
  return Buffer.concat(parts).toString('utf8')
}
