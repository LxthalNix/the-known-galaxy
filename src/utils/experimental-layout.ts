import { chronologyKey, compareEvents, type ChronologicalEvent } from './chronology.ts';

interface Era { id: string; start: { year: number; calendar: 'BBD' | 'ABD' }; end: { year: number; calendar: 'BBD' | 'ABD' } | null }
interface Record extends ChronologicalEvent { era: string; importance: 'major' | 'standard' | 'minor'; image?: string; gallery?: readonly { image: string }[] }
export const YEAR_SCALE = 450;
const GUTTER = 180;

/** Uniform year cells with ordered, evenly spaced event slots. Filtering never participates. */
export function layoutExperimentalTimeline<T extends Record>(records: readonly T[], eras: readonly Era[], concept: 'a' | 'b', focusDate?: { year: number; calendar: 'BBD' | 'ABD' }) {
  const compact = concept === 'a';
  const rowGap = compact ? 10 : 24;
  const aboveGap = compact ? 20 : 38;
  const belowGap = compact ? 56 : 62;
  const sorted = [...records].sort(compareEvents);
  const start = Math.min(...eras.map(e => chronologyKey(e.start.year, e.start.calendar)), ...sorted.map(e => chronologyKey(e.year, e.calendar)));
  const focusYear = focusDate ? chronologyKey(focusDate.year, focusDate.calendar) : undefined;
  const end = Math.max(...eras.map(e => e.end ? chronologyKey(e.end.year, e.end.calendar) : Math.max(e.id === 'to-be-determined' ? 65 : chronologyKey(e.start.year, e.start.calendar) + 4, ...sorted.filter(r => r.era === e.id).map(r => chronologyKey(r.year, r.calendar)), ...(focusYear === undefined ? [] : [focusYear + 4]))), ...sorted.map(e => chronologyKey(e.year, e.calendar)), ...(focusYear === undefined ? [] : [focusYear]));
  const yearX = (year: number) => GUTTER + (year - start + .5) * YEAR_SCALE;
  const sections = eras.map(era => {
    const first = chronologyKey(era.start.year, era.start.calendar);
    const last = era.end ? chronologyKey(era.end.year, era.end.calendar) : end;
    const years = new Set([first, last]);
    // Every year is useful at the wider scale, including years with no recorded events.
    for (let year = first; year <= last; year++) years.add(year);
    return { id: era.id, x: GUTTER + (first - start) * YEAR_SCALE, width: (last - first + 1) * YEAR_SCALE,
      ticks: [...years].sort((a,b) => a-b).filter((year, i, all) => i === 0 || (year - all[i-1]) * YEAR_SCALE >= 64).map(year => ({ x: yearX(year) - (GUTTER + (first - start) * YEAR_SCALE), year: Math.abs(year), calendar: (year < 0 ? 'BBD' : 'ABD') as 'BBD' | 'ABD' })) };
  });
  const rows = { above: [] as { right: number; height: number }[], below: [] as { right: number; height: number }[] };
  const grouped = new Map<number, T[]>();
  for (const event of sorted) { const key = chronologyKey(event.year, event.calendar); grouped.set(key, [...(grouped.get(key) ?? []), event]); }
  const placements = sorted.map((event, index) => {
    const year = chronologyKey(event.year, event.calendar);
    const group = grouped.get(year)!;
    const rank = group.indexOf(event);
    // Center each slot inside its share of the year. Four records give quarter-year
    // gaps, including between the last slot and the next year's first slot.
    // These positions express timelineOrder, not invented precise event dates.
    const fraction = (rank + .5) / group.length;
    const x = GUTTER + (year - start + fraction) * YEAR_SCALE;
    // Image cards gain a wider thumbnail without taking width from the title.
    // A gallery's first image is the cover when no separate main image was supplied.
    const width = concept === 'a' ? (event.importance === 'major' && (event.image || event.gallery?.length) ? 332 : { major: 280, standard: 250, minor: 210 }[event.importance]) : ({ major: 282, standard: 240, minor: 210 }[event.importance]);
    const height = concept === 'a' ? ({ major: 110, standard: 104, minor: 86 }[event.importance]) : ({ major: 198, standard: 158, minor: 102 }[event.importance]);
    const left = x - width / 2;
    const freeRow = (lane: 'above' | 'below') => { const found = rows[lane].findIndex(row => row.right + 18 <= left); return found < 0 ? rows[lane].length : found; };
    const above = freeRow('above'), below = freeRow('below');
    const lane = (above < below ? 'above' : below < above ? 'below' : index % 2 ? 'below' : 'above') as 'above' | 'below';
    const row = lane === 'above' ? above : below;
    const previous = rows[lane][row];
    rows[lane][row] = { right: left + width, height: Math.max(previous?.height ?? 0, height) };
    return { event, x, labelX: x, width, height, row, lane, slot: rank, slots: group.length };
  });
  const extent = (lane: 'above' | 'below') => rows[lane].reduce((sum, row) => sum + row.height + rowGap, 0) - (compact && rows[lane].length ? rowGap : 0);
  // Reserve 12px above a 20px era heading, then 16px before the first card row.
  const axisY = compact ? 48 + aboveGap + Math.max(110, extent('above')) : 80 + Math.max(190, extent('above'));
  const height = compact ? axisY + belowGap + Math.max(110, extent('below')) + 14 : axisY + 72 + Math.max(190, extent('below'));
  const events = placements.map(item => {
    const rowOffset = rows[item.lane].slice(0, item.row).reduce((sum,row) => sum + row.height + rowGap, 0);
    const y = item.lane === 'above' ? axisY - aboveGap - rowOffset - rows.above[item.row].height : axisY + belowGap + rowOffset;
    const leaderEndY = item.lane === 'above' ? y + item.height : y;
    return { ...item, y, leaderEndY };
  });
  const routed = events.map(item => {
    const blockers = events.filter(other => other.lane === item.lane && other.row < item.row);
    const candidates = [0, ...Array.from({ length: 48 }, (_, i) => [(i+1)*12, -(i+1)*12]).flat()];
    const routeX = candidates.map(offset => item.x + offset).find(x => blockers.every(other => x < other.labelX - other.width/2 - 6 || x > other.labelX + other.width/2 + 6)) ?? item.x;
    // Stacked leaders use an unobstructed rail; never draw a line through another label.
    const joinX = Math.max(item.labelX - item.width/2 + 14, Math.min(item.labelX + item.width/2 - 14, routeX));
    const bendY = axisY + (item.lane === 'above' ? -20 : 20);
    const endBendY = item.leaderEndY + (item.lane === 'above' ? 12 : -12);
    const leaderPath = Math.abs(routeX - item.x) < 1 ? `M ${item.x} ${axisY} V ${endBendY} L ${joinX} ${item.leaderEndY}` : `M ${item.x} ${axisY} L ${routeX} ${bendY} V ${endBendY} L ${joinX} ${item.leaderEndY}`;
    return { ...item, routeX, leaderPath };
  });
  return { events: routed, sections, width: GUTTER * 2 + (end - start + 1) * YEAR_SCALE, height, axisY, start, end, yearScale: YEAR_SCALE,
    dateX: (year: number, calendar: 'BBD' | 'ABD') => yearX(chronologyKey(year, calendar)) };
}
