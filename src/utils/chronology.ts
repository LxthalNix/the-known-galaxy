export type CalendarEra = 'BBD' | 'ABD';

/**
 * Converts a Known Galaxy date to a sortable number.
 * More negative = further before the Battle of Dathomir.
 * 0 ABD is the chronology origin.
 */
export function chronologyKey(year: number, calendar: CalendarEra): number {
  return calendar === 'BBD' ? -year : year;
}

export function formatDate(year: number, calendar: CalendarEra): string {
  return `${year} ${calendar}`;
}
