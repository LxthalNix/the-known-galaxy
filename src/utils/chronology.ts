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

export interface ChronologicalEvent {
  slug: string;
  year: number;
  calendar: CalendarEra;
  timelineOrder?: number;
}

/** Stable ordering for coincident dates; editors may explicitly order same-year records. */
export function compareEvents(a: ChronologicalEvent, b: ChronologicalEvent): number {
  return chronologyKey(a.year, a.calendar) - chronologyKey(b.year, b.calendar)
    || (a.timelineOrder ?? 0) - (b.timelineOrder ?? 0)
    || a.slug.localeCompare(b.slug, 'en');
}
