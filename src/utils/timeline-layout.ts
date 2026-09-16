import { chronologyKey, compareEvents, type ChronologicalEvent } from './chronology.ts';

interface TimelineEra {
  id: string;
  start: { year: number; calendar: 'BBD' | 'ABD' };
  end: { year: number; calendar: 'BBD' | 'ABD' } | null;
}

/**
 * Each year starts at 30px. Consecutive events reserve 164px, so alternating
 * 280px cards in the same lane cannot collide. Era widths expand for density.
 * Date gaps cap at 280px: distant history never creates enormous empty tracks.
 * Filtering uses the complete layout so dates and era positions never shift.
 */
export function layoutTimeline<T extends ChronologicalEvent & { era: string }>(events: T[], eras: readonly TimelineEra[]) {
  const placed: { event: T; x: number; lane: 'above' | 'below' }[] = [];
  const sections: { id: string; x: number; width: number; ticks: { x: number; year: number; calendar: 'BBD' | 'ABD' }[] }[] = [];
  let offset = 0;
  for (const era of eras) {
    const records = events.filter((event) => event.era === era.id).sort(compareEvents);
    const start = chronologyKey(era.start.year, era.start.calendar);
    const end = era.end ? chronologyKey(era.end.year, era.end.calendar) : Math.max(start + 4, ...records.map((event) => chronologyKey(event.year, event.calendar)));
    const anchors: { year: number; x: number }[] = [{ year: start, x: 80 }];
    let lastYear = start;
    let lastX = 80;
    records.forEach((event, index) => {
      const year = chronologyKey(event.year, event.calendar);
      const gap = Math.min(280, Math.max(0, year - lastYear) * 30);
      const x = index === 0 ? 150 + gap : lastX + Math.max(164, gap);
      placed.push({ event, x: offset + x, lane: placed.length % 2 === 0 ? 'above' : 'below' });
      anchors.push({ year, x });
      lastYear = year;
      lastX = x;
    });
    const width = Math.max(440, lastX + Math.min(280, Math.max(0, end - lastYear) * 30) + 190);
    anchors.push({ year: end + 1, x: width - 35 });
    const yearSet = new Set([start, end]);
    const step = Math.max(5, Math.ceil((end - start) / 12 / 5) * 5);
    for (let year = Math.ceil(start / step) * step; year <= end; year += step) yearSet.add(year);
    const ticks = [...yearSet].sort((a, b) => a - b).map((year) => {
      const before = [...anchors].reverse().find((anchor) => anchor.year <= year)!;
      const after = anchors.find((anchor) => anchor.year > year) ?? before;
      const ratio = after.year === before.year ? 0 : (year - before.year) / (after.year - before.year);
      return { x: before.x + ratio * (after.x - before.x), year: Math.abs(year), calendar: (year < 0 ? 'BBD' : 'ABD') as 'BBD' | 'ABD' };
    }).filter((tick, index, all) => index === 0 || tick.x - all[index - 1].x >= 62);
    sections.push({ id: era.id, x: offset, width, ticks });
    offset += width;
  }
  return { events: placed, sections, width: offset };
}
