/**
 * CSV for spreadsheet programs: UTF-8 with a byte-order mark (so Excel reads umlauts and Arabic
 * correctly), semicolons (the separator German Excel expects) and CRLF line ends. Every cell is
 * quoted. Cells that a spreadsheet would treat as a formula (= + - @, tab, carriage return) get a
 * leading apostrophe: exported names and addresses come from a public form, and a value such as
 * `=HYPERLINK(...)` must never run in the reader's spreadsheet (CSV injection).
 */
export const CSV_SEPARATOR = ';'
const BOM = '﻿'

export function csvCell(value: unknown): string {
  if (value == null) return '""'
  let text = typeof value === 'string' ? value : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function toCsv(header: readonly string[], rows: readonly (readonly unknown[])[]): string {
  const lines = [header, ...rows].map((cells) => cells.map(csvCell).join(CSV_SEPARATOR))
  return `${BOM}${lines.join('\r\n')}\r\n`
}
