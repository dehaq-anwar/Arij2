import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { toCsv, type CsvSeparator } from '@/cms/membership/csv'

/**
 * Opens the exported CSV in LibreOffice Calc (headless) the way a person would, with formula
 * evaluation switched on (the worst case), and reads back what the cells contain. Runs where
 * LibreOffice is installed and is skipped elsewhere (CI). Excel cannot run here; see
 * docs/CONTROL-CENTER.md §16 for the manual check.
 */
const soffice = (() => {
  try {
    execFileSync('soffice', ['--version'], { stdio: 'ignore', timeout: 30_000 })
    return true
  } catch {
    return false
  }
})()

const VALUES = [
  'Müller-Lüdenscheid',
  'سلام عليكم',
  '=1+1',
  '+49 170 0000000',
  '-5',
  '@SUM(1;2)',
  '=HYPERLINK("http://example.org";"x")',
  '\t=1+1',
  ' =1+1',
  'Straße 1; 2. OG',
  'a,b',
  'Say "hi"',
  'Zeile 1\nZeile 2',
]

const dir = soffice ? mkdtempSync(path.join(os.tmpdir(), 'yop-csv-')) : ''
afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
})

/** Cells of the first sheet: their text and whether LibreOffice made a formula of them. */
function openInCalc(separator: CsvSeparator, raw?: string) {
  const name = raw ? 'control' : separator === ';' ? 'semicolon' : 'comma'
  const file = path.join(dir, `${name}.csv`)
  writeFileSync(
    file,
    raw ??
      toCsv(
        ['Wert'],
        VALUES.map((v) => [v]),
        separator,
      ),
  )
  const code = separator.charCodeAt(0)
  // Separator, quote ("), UTF-8, from line 1, -, German, quoted fields not forced to text,
  // detect special numbers, …, evaluate formulas (token 13): the most permissive import.
  const filter = `CSV:${code},34,76,1,,1031,false,true,false,false,false,-1,true`
  execFileSync(
    'soffice',
    [
      `-env:UserInstallation=file://${dir}/profile`,
      '--headless',
      `--infilter=${filter}`,
      '--convert-to',
      'fods',
      '--outdir',
      dir,
      file,
    ],
    { stdio: 'ignore', timeout: 120_000 },
  )
  const xml = readFileSync(path.join(dir, `${name}.fods`), 'utf8')
  const rows = [...xml.matchAll(/<table:table-row[^>]*>([\s\S]*?)<\/table:table-row>/g)]
  return rows.map(([, row]) => {
    const cell = /<table:table-cell([^>]*)>([\s\S]*?)<\/table:table-cell>/.exec(row ?? '')
    const attributes = cell?.[1] ?? ''
    const text = [...(cell?.[2] ?? '').matchAll(/<text:p>([\s\S]*?)<\/text:p>/g)]
      .map(([, p]) =>
        (p ?? '')
          .replace(/<text:s(?: text:c="(\d+)")?\/>/g, (_, n) => ' '.repeat(Number(n ?? 1)))
          .replace(/<text:tab\/>/g, '\t')
          .replace(/<[^>]+>/g, '')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&apos;/g, "'"),
      )
      .join('\n')
    return { formula: /table:formula=/.test(attributes), text }
  })
}

describe.skipIf(!soffice)('exported CSV opened in LibreOffice Calc', () => {
  it('control: without the apostrophe the same import runs the formula', () => {
    const [, cell] = openInCalc(';', '"Wert"\r\n"=1+1"\r\n')
    expect(cell?.formula).toBe(true)
  })

  for (const separator of [';', ','] as const) {
    it(`keeps every value as text, never a formula (separator "${separator}")`, () => {
      const [header, ...cells] = openInCalc(separator)
      expect(header?.text).toBe('Wert')
      expect(cells.slice(0, VALUES.length)).toHaveLength(VALUES.length)
      cells.slice(0, VALUES.length).forEach((cell, index) => {
        const value = VALUES[index]!
        expect(cell.formula, `formula for ${JSON.stringify(value)}`).toBe(false)
        // Values a spreadsheet could run carry the visible apostrophe; the others are unchanged.
        const expected = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
        expect(cell.text, JSON.stringify(value)).toBe(expected)
      })
    })
  }
})
