import type { ExperimentalEvent } from '../types/experiment';
import { galleryThumbnails } from '../utils/experimental-content';

/** Explicitly synthetic UI fixtures. Never loaded by the production content collection. */
export async function experimentFixtures(): Promise<ExperimentalEvent[]> {
  const summary = 'Layout and interaction fixture. This is not canonical lore.';
  const html = '<p>This record tests date clustering, perspective fallback and image viewing. The images are supplied game-interface references, not evidence of a historical event.</p>';
  const gallery = await galleryThumbnails([
    { image: '/images/experiment/reference-map.png', alt: 'Supplied TKG galaxy-map interface reference', caption: 'Interface reference only · galaxy map' },
    { image: '/images/experiment/reference-teaching.png', alt: 'Supplied TKG teaching interface reference', caption: 'Interface reference only · teaching menu' },
    { image: '/images/experiment/reference-alignment.png', alt: 'Supplied TKG alignment-selection reference', caption: 'Interface reference only · alignment selection' },
  ]);
  return [
    { slug: 'fixture-single', title: 'Layout fixture: one event', year: 3, timelineOrder: 0, factions: ['jedi'], importance: 'standard', era: 'exodus-and-recovery' },
    { slug: 'fixture-major', title: 'Gallery demonstration', year: 17, timelineOrder: -2, factions: ['jedi','sith'], importance: 'major', era: 'hallowed-preparations', gallery },
    { slug: 'fixture-standard', title: 'Layout fixture: standard record', year: 17, timelineOrder: -1, factions: ['jedi'], importance: 'standard', era: 'hallowed-preparations' },
    { slug: 'fixture-minor', title: 'Layout fixture: minor record', year: 17, timelineOrder: 1, factions: ['sith'], importance: 'minor', era: 'hallowed-preparations' },
    { slug: 'fixture-fourth', title: 'Layout fixture: fourth record in the same year', year: 17, timelineOrder: 2, factions: ['jedi','sith'], importance: 'standard', era: 'hallowed-preparations' },
    { slug: 'fixture-consecutive-a', title: 'Layout fixture: the following year', year: 18, timelineOrder: 0, factions: ['sith'], importance: 'major', era: 'hallowed-preparations' },
    { slug: 'fixture-consecutive-b', title: 'Layout fixture: another record in that year', year: 18, timelineOrder: 1, factions: ['jedi'], importance: 'minor', era: 'hallowed-preparations' },
  ].map(fixture => ({ ...fixture, calendar: 'ABD', types: ['other'], summary, html, searchText: `${fixture.title} ${summary}`.toLocaleLowerCase(), locations: [], characters: [], relatedEvents: [], draft: false, demo: true })) as ExperimentalEvent[];
}
