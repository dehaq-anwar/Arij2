import { describe, expect, it } from 'vitest'

import { auditRetentionMonths, DEFAULT_AUDIT_RETENTION_MONTHS } from '@/cms/jobs/audit-retention'
import { startOfTomorrowBerlin } from '@/cms/jobs/membership-reminders'
import { monthsBefore } from '@/cms/jobs/retention'
import { csvCell, toCsv } from '@/cms/membership/csv'
import { cleanPurpose, EXPORT_COLUMNS, exportTable, pickColumns } from '@/cms/membership/export'
import { cleanFilter, exportWhere } from '@/cms/membership/export-endpoint'
import { searchWhere, stageOf, stageWhere } from '@/cms/membership/stage'

describe('stages of an application', () => {
  it('derives "consent pending" for open applications under 18 without a consent date', () => {
    expect(stageOf({ status: 'received' })).toBe('received')
    expect(stageOf({ status: 'inReview' })).toBe('inReview')
    expect(stageOf({ status: 'received', under18: true })).toBe('consentPending')
    expect(stageOf({ status: 'inReview', under18: true, guardian: {} })).toBe('consentPending')
    expect(
      stageOf({ status: 'inReview', under18: true, guardian: { consentReceivedAt: '2026-10-01' } }),
    ).toBe('inReview')
    // A decision is a decision, whatever else is recorded.
    expect(stageOf({ status: 'accepted', under18: true })).toBe('accepted')
    expect(stageOf({ status: 'rejected', under18: true })).toBe('rejected')
  })

  it('turns stages into queries that do not overlap', () => {
    expect(stageWhere('all')).toBeNull()
    expect(stageWhere('open')).toEqual({ status: { in: ['received', 'inReview'] } })
    expect(JSON.stringify(stageWhere('consentPending'))).toContain('"exists":false')
    expect(JSON.stringify(stageWhere('received'))).toContain('"exists":true')
    expect(stageWhere('accepted')).toEqual({ status: { equals: 'accepted' } })
  })

  it('searches names and e-mail, trimmed and limited', () => {
    expect(searchWhere('  ')).toBeNull()
    const where = searchWhere(` Muster${'x'.repeat(200)} `)!
    expect((where.or as { firstName?: { like: string } }[])[0]!.firstName!.like).toHaveLength(100)
  })
})

describe('CSV export', () => {
  it('quotes every cell and neutralises spreadsheet formulas', () => {
    expect(csvCell('Müller')).toBe('"Müller"')
    expect(csvCell('Say "hi"')).toBe('"Say ""hi"""')
    for (const formula of ['=1+1', '+1', '-1', '@SUM(A1)', '\t=1', '\r=1']) {
      expect(csvCell(formula).startsWith(`"'`), formula).toBe(true)
    }
    expect(csvCell(null)).toBe('""')
    expect(csvCell('a;b')).toBe('"a;b"')
  })

  it('writes UTF-8 with a byte-order mark, semicolons and CRLF', () => {
    const csv = toCsv(['A', 'B'], [['1', 'سلام']])
    expect(csv).toBe('﻿"A";"B"\r\n"1";"سلام"\r\n')
  })

  it('exports only known columns, in a fixed order, translated', () => {
    const columns = pickColumns('members', ['email', 'internalNotes', 'firstName', 42])
    expect(columns.map((c) => c.key)).toEqual(['firstName', 'email'])
    const keys = EXPORT_COLUMNS.applications.map((c) => c.key)
    for (const never of ['internalNotes', 'consent', 'decidedBy', 'assignedTo', 'locale']) {
      expect(keys).not.toContain(never)
    }
    const table = exportTable(
      'members',
      pickColumns('members', ['lastName', 'membershipType', 'memberSince', 'minorAtAdmission']),
      [
        {
          lastName: 'Muster',
          membershipType: 'supporting',
          memberSince: '2026-03-31T22:30:00.000Z',
          minorAtAdmission: true,
        },
      ],
      'de',
    )
    expect(table.header).toEqual([
      'Nachname',
      'Art der Mitgliedschaft',
      'Mitglied seit',
      'Bei Aufnahme unter 18',
    ])
    // 22:30 UTC on 31 March is already 1 April in Berlin.
    expect(table.rows).toEqual([['Muster', 'Fördernd', '2026-04-01', 'ja']])
    expect(exportTable('members', columns, [{ firstName: 'A', email: 'b' }], 'ar').header).toEqual([
      'الاسم الأول',
      'البريد الإلكتروني',
    ])
  })

  it('needs a real purpose and keeps search texts out of the register', () => {
    expect(cleanPurpose('kurz')).toBeNull()
    expect(cleanPurpose('x'.repeat(301))).toBeNull()
    expect(cleanPurpose('  Einladung   zur\nVersammlung  ')).toBe('Einladung zur Versammlung')
    expect(cleanFilter('members', { status: 'ended', type: 'supporting', q: 'Muster' })).toEqual({
      status: 'ended',
      type: 'supporting',
      search: 'yes',
    })
    expect(cleanFilter('applications', { stage: 'nonsense', type: 'x' })).toEqual({})
    expect(exportWhere('members', { status: 'active' })).toEqual({ status: { equals: 'active' } })
    expect(exportWhere('members', { status: 'all' })).toEqual({})
  })
})

describe('periods and dates', () => {
  it('keeps the audit log 12 months unless the server says otherwise (1–120)', () => {
    expect(DEFAULT_AUDIT_RETENTION_MONTHS).toBe(12)
    expect(auditRetentionMonths(undefined)).toBe(12)
    expect(auditRetentionMonths('24')).toBe(24)
    for (const bad of ['0', '-3', '1.5', '121', 'abc', '']) {
      expect(auditRetentionMonths(bad), bad).toBe(12)
    }
  })

  it('counts months forward and backward without overflowing short months', () => {
    expect(monthsBefore(new Date('2026-08-31T12:00:00Z'), 6).toISOString()).toBe(
      '2026-02-28T12:00:00.000Z',
    )
    expect(monthsBefore(new Date('2026-08-31T12:00:00Z'), -6).toISOString()).toBe(
      '2027-02-28T12:00:00.000Z',
    )
  })

  it('finds the start of tomorrow in Berlin, summer and winter time', () => {
    expect(startOfTomorrowBerlin(new Date('2026-07-01T10:00:00Z')).toISOString()).toBe(
      '2026-07-01T22:00:00.000Z',
    )
    expect(startOfTomorrowBerlin(new Date('2026-12-01T23:30:00Z')).toISOString()).toBe(
      '2026-12-02T23:00:00.000Z',
    )
  })
})
