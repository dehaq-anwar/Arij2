/**
 * Dates in the Control Center's edit screens as in German, 21.10.2026 (Payload's date picker
 * would show 10/21/2026); the lists use admin.dateFormat (payload.config.ts).
 */
export const DAY_PICKER = { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' } as const
export const DAY_TIME_PICKER = {
  pickerAppearance: 'dayAndTime',
  displayFormat: 'dd.MM.yyyy, HH:mm',
} as const
