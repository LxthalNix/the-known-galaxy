import { canonicalCalendar } from '../data/experimental-calendar.ts';

export interface CanonicalDate { year: number; calendar: 'BBD' | 'ABD' }

/** UTC month boundaries give all readers the same date, independent of month length. */
export function currentCanonicalDate(date = new Date()): CanonicalDate {
  const months = (date.getUTCFullYear() - canonicalCalendar.anchorYear) * 12
    + date.getUTCMonth() + 1 - canonicalCalendar.anchorMonth;
  const year = canonicalCalendar.anchorABD + months;
  return { year: Math.abs(year), calendar: year < 0 ? 'BBD' : 'ABD' };
}
