import { loreCalendars } from '../data/lore-calendars.ts';

export type LoreCalendar = 'BBD' | 'ABD' | 'BDO' | 'ADO';
export type CalendarSystem = keyof typeof loreCalendars;
export interface LoreDate { year: number; calendar: LoreCalendar }

/** Normalize either submitted calendar to one signed canonical year. */
export function toCanonicalYear(year: number, calendar: LoreCalendar): number {
  if (!Number.isSafeInteger(year) || year < 0) throw new Error('Year must be a nonnegative safe integer.');
  const system = Object.values(loreCalendars).find(value => value.before === calendar || value.after === calendar);
  if (!system) throw new Error('Choose BBD, ABD, BDO, or ADO.');
  const before = calendar === system.before;
  if (before && year === 0) throw new Error(`The origin is 0 ${system.after}; 0 ${system.before} is not valid.`);
  const canonical = system.origin + (before ? -year : year);
  if (!Number.isSafeInteger(canonical)) throw new Error('Converted date exceeds the supported integer range.');
  return canonical;
}

export function fromCanonicalYear(year: number, system: CalendarSystem): LoreDate {
  if (!Number.isSafeInteger(year)) throw new Error('Canonical year must be a safe integer.');
  const epoch = loreCalendars[system];
  const relative = year - epoch.origin;
  if (!Number.isSafeInteger(relative)) throw new Error('Converted date exceeds the supported integer range.');
  return { year: Math.abs(relative), calendar: relative < 0 ? epoch.before : epoch.after };
}

/** Event files always retain the existing normalized BBD/ABD storage contract. */
export function toCanonicalDate(year: number, calendar: LoreCalendar): { year: number; calendar: 'BBD' | 'ABD' } {
  const canonical = toCanonicalYear(year, calendar);
  return { year: Math.abs(canonical), calendar: canonical < 0 ? 'BBD' : 'ABD' };
}

export function formatPerspectiveDate(year: number, calendar: LoreCalendar, perspective: string): string {
  const date = fromCanonicalYear(toCanonicalYear(year, calendar), perspective === 'jedi' ? 'ossus' : 'dathomir');
  return `${date.year} ${date.calendar}`;
}

/** A complete date search compares dates, rather than matching digits in unrelated prose. */
export function canonicalYearFromQuery(query: string): number | null {
  const match = query.trim().match(/^(\d+)\s+(BBD|ABD|BDO|ADO)$/i);
  if (!match) return null;
  try { return toCanonicalYear(Number(match[1]), match[2].toUpperCase() as LoreCalendar); }
  catch { return NaN; } // A recognizable but invalid date must not match any record.
}
