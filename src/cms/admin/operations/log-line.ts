export type Line = { time: string; level: 'error' | 'warn' | 'info'; text: string }

const PINO_LEVELS: Record<number, Line['level']> = { 40: 'warn', 50: 'error', 60: 'error' }

/**
 * A Docker log line ("2026-10-21T09:41:12.123Z message") split into time, level and text.
 * JSON lines (the app's logger, the agent, Caddy) show their message and the remaining fields.
 */
export function parseLine(raw: string): Line {
  const match = /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s?(.*)$/.exec(raw)
  const time = match?.[1] ?? ''
  let text = match ? (match[2] ?? '') : raw
  let level: Line['level'] = 'info'
  if (text.startsWith('{')) {
    try {
      const json = JSON.parse(text) as Record<string, unknown>
      const numeric = typeof json.level === 'number' ? json.level : null
      const named = typeof json.level === 'string' ? json.level.toLowerCase() : null
      level =
        (numeric && PINO_LEVELS[numeric]) ||
        (named === 'error' || named === 'fatal' ? 'error' : named === 'warn' ? 'warn' : 'info')
      const message = json.msg ?? json.message ?? ''
      const rest = Object.entries(json)
        .filter(
          ([key]) =>
            !['level', 'time', 'ts', 'msg', 'message', 'pid', 'hostname', 'v', 'at'].includes(key),
        )
        .map(
          ([key, value]) =>
            `${key}=${typeof value === 'object' ? JSON.stringify(value) : String(value)}`,
        )
        .join(' ')
      text = [String(message), rest].filter(Boolean).join('  ')
    } catch {
      // Not JSON after all: shown as it is.
    }
  } else if (/\b(ERROR|FATAL|PANIC)\b/.test(text)) level = 'error'
  else if (/\b(WARN|WARNING)\b/.test(text)) level = 'warn'
  return { time, level, text }
}
