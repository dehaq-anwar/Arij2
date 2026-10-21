import type { Event } from '@/payload-types'

/** "20260314T170000Z" */
const stamp = (value: string | Date) =>
  new Date(value)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

/** Text values: escaped as RFC 5545 requires (backslash, semicolon, comma, line breaks). */
const escape = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Lines longer than 75 octets are folded (continued on the next line after a space). */
function fold(line: string) {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line
  const parts: string[] = []
  let current = ''
  for (const char of line) {
    if (new TextEncoder().encode(current + char).length > (parts.length ? 74 : 75)) {
      parts.push(current)
      current = char
    } else current += char
  }
  parts.push(current)
  return parts.join('\r\n ')
}

/** One event as an iCalendar file; without an end, it lasts one hour. */
export function eventCalendar(
  event: Pick<Event, 'id' | 'title' | 'excerpt' | 'startsAt' | 'endsAt' | 'location' | 'updatedAt'>,
  url: string,
  now = new Date(),
) {
  const end = event.endsAt ?? new Date(new Date(event.startsAt).getTime() + 60 * 60 * 1000)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Youth of Peace e.V.//Website//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:event-${event.id}@youth-of-peace`,
    `DTSTAMP:${stamp(now)}`,
    `LAST-MODIFIED:${stamp(event.updatedAt)}`,
    `DTSTART:${stamp(event.startsAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(event.title)}`,
    ...(event.excerpt ? [`DESCRIPTION:${escape(event.excerpt)}`] : []),
    ...(event.location ? [`LOCATION:${escape(event.location)}`] : []),
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}
