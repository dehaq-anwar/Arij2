import { describe, expect, it } from 'vitest'

import { displayTitle } from '@/cms/collections/membership-fields'
import { canWorkOnInbox } from '@/cms/membership/assignees'

describe('who can be assigned', () => {
  it('everyone whose role, minus restrictions, can read and work on the inbox', () => {
    expect(canWorkOnInbox({ role: 'superAdmin' })).toBe(true)
    expect(canWorkOnInbox({ role: 'boardAdmin' })).toBe(true)
    expect(canWorkOnInbox({ role: 'membershipManager' })).toBe(true)
    for (const role of ['contentEditor', 'technicalAdmin', 'auditor']) {
      expect(canWorkOnInbox({ role }), role).toBe(false)
    }
  })

  it('not someone deactivated, or restricted from the inbox', () => {
    expect(canWorkOnInbox({ role: 'membershipManager', disabled: true })).toBe(false)
    expect(canWorkOnInbox({ role: 'boardAdmin', restrictions: ['inbox.write'] })).toBe(false)
    expect(canWorkOnInbox({ role: 'boardAdmin', restrictions: ['inbox.read'] })).toBe(false)
    expect(canWorkOnInbox({ role: 'boardAdmin', restrictions: ['members.write'] })).toBe(true)
    expect(canWorkOnInbox(null)).toBe(false)
  })
})

describe('titles of applications and register entries', () => {
  it('"Last name, first name"; the number once the data were moved or if there is no name', () => {
    expect(displayTitle({ id: 7, firstName: 'Erika', lastName: 'Muster' })).toBe('Muster, Erika')
    expect(displayTitle({ id: 7, firstName: 'محمد', lastName: 'أحمد' })).toBe('أحمد, محمد')
    expect(displayTitle({ id: 7, lastName: 'Muster', firstName: '  ' })).toBe('Muster')
    expect(
      displayTitle({
        id: 7,
        firstName: 'Erika',
        lastName: 'Muster',
        personalDataMovedOn: '2026-10-21T00:00:00.000Z',
      }),
    ).toBe('#7')
    expect(displayTitle({ id: 7, firstName: null, lastName: null })).toBe('#7')
    expect(displayTitle({ firstName: null, lastName: null })).toBeNull()
  })
})
