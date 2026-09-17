import { eras } from './eras.ts';
import type { ExperimentalEvent } from '../types/experiment';

/** Fill the local preview to four total events/year without duplicating existing lore. */
export function densityFixtures(canonicalEvents: readonly ExperimentalEvent[], count = 4, firstYear = 15, lastYear = 25): ExperimentalEvent[] {
  const fixtures: ExperimentalEvent[] = [];
  const titles = [
    'A turning point for the two Orders',
    'An expedition beyond the familiar worlds',
    'Negotiations and preparations for the following campaign',
    'A gathering at the temple',
  ];
  const importance = ['major', 'standard', 'standard', 'minor'] as const;
  const factions: ExperimentalEvent['factions'][] = [['jedi', 'sith'], ['jedi'], ['sith'], ['jedi', 'sith']];
  for (let year = firstYear; year <= lastYear; year++) {
    const existing = canonicalEvents.filter(event => event.calendar === 'ABD' && event.year === year);
    const lastOrder = Math.max(-1, ...existing.map(event => event.timelineOrder));
    for (let slot = existing.length; slot < count; slot++) {
      const title = `${titles[(slot + year) % titles.length]} · example ${year}.${slot + 1}`;
      const summary = `Synthetic density example for ${year} ABD. ${count} records per canonical year represent the proposed weekly event schedule. This is not canonical lore.`;
      fixtures.push({
        slug: `density-${year}-${slot + 1}`, title, year, calendar: 'ABD',
        timelineOrder: lastOrder + slot - existing.length + 1,
        era: eras.find(era => era.start.calendar === 'ABD' && year >= era.start.year && (!era.end || year <= era.end.year))!.id,
        importance: importance[slot % importance.length],
        ...(count === 5 && importance[slot % importance.length] === 'major' && canonicalEvents.find(event => event.image)?.image ? { image: canonicalEvents.find(event => event.image)!.image, imageAlt: 'Existing imagery reused only for a synthetic density example' } : {}), factions: [...factions[(slot + year) % factions.length]],
        types: ['other'], locations: [], characters: [], relatedEvents: [],
        summary, html: `<p>${summary}</p><p>The title, importance and faction assignments are layout examples only. No historical account or approved location is being added.</p>`,
        searchText: `${title} ${summary}`.toLocaleLowerCase(),
        draft: false, demo: true, demoScenario: count === 5 ? 'density-five' : 'density',
      });
    }
  }
  return fixtures;
}
