/**
 * CSV for spreadsheet programs: UTF-8 with a byte-order mark (so Excel reads umlauts and Arabic
 * correctly), CRLF line ends and, by default, semicolons (the separator German Excel and
 * LibreOffice expect; commas for Excel in English). Every cell is
 * quoted. Cells that a spreadsheet would treat as a formula (= + - @, tab, carriage return) get a
 * leading apostrophe: exported names and addresses come from a public form, and a value such as
 * `=HYPERLINK(...)` must never run in the reader's spreadsheet (CSV injection).
 */
export const CSV_SEPARATORS = [';', ','] as const
export type CsvSeparator = (typeof CSV_SEPARATORS)[number]
const BOM = '﻿'

export function csvCell(value: unknown): string {
  if (value == null) return '""'
  let text = typeof value === 'string' ? value : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function toCsv(
  header: readonly string[],
  rows: readonly (readonly unknown[])[],
  separator: CsvSeparator = ';',
): string {
  const lines = [header, ...rows].map((cells) => cells.map(csvCell).join(separator))
  return `${BOM}${lines.join('\r\n')}\r\n`
}
