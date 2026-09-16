import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chronologyKey, compareEvents } from '../src/utils/chronology.ts';
import { layoutTimeline } from '../src/utils/timeline-layout.ts';
import { matchesFilters } from '../src/utils/filter-events.ts';
import { withBase, contentWithBase } from '../src/utils/paths.ts';

test('BBD dates precede the 0 ABD origin and ABD dates', () => {
  const dates = [{ slug: 'after', year: 2, calendar: 'ABD' as const }, { slug: 'older', year: 31, calendar: 'BBD' as const }, { slug: 'origin', year: 0, calendar: 'ABD' as const }, { slug: 'before', year: 1, calendar: 'BBD' as const }];
  assert.deepEqual(dates.sort(compareEvents).map((event) => event.slug), ['older', 'before', 'origin', 'after']);
  assert.equal(chronologyKey(22, 'BBD'), -22);
});

test('same-year records respect editor order before the stable slug fallback', () => {
  const records = ['b', 'a', 'c'].map((slug) => ({ slug, year: 4, calendar: 'ABD' as const, timelineOrder: slug === 'c' ? -1 : 0 }));
  assert.deepEqual(records.sort(compareEvents).map((event) => event.slug), ['c', 'a', 'b']);
});

test('hundreds of same-year events remain ordered, separate, and within their era', () => {
  const era = { id: 'test', start: { year: 0, calendar: 'ABD' as const }, end: { year: 16, calendar: 'ABD' as const } };
  const records = Array.from({ length: 300 }, (_, timelineOrder) => ({ slug: `record-${timelineOrder}`, year: 4, calendar: 'ABD' as const, era: 'test', timelineOrder }));
  const layout = layoutTimeline(records.reverse(), [era]);
  for (let i = 0; i < layout.events.length; i++) {
    const item = layout.events[i];
    assert.equal(item.event.timelineOrder, i);
    assert.ok(item.x - 140 >= 0 && item.x + 140 < layout.width);
    if (i > 1) assert.ok(item.x - layout.events[i - 2].x >= 280, 'same-lane cards must not overlap');
  }
});

test('widely separated history caps gaps and empty eras retain orientation', () => {
  const era = { id: 'ancient', start: { year: 10000, calendar: 'BBD' as const }, end: { year: 1, calendar: 'BBD' as const } };
  const records = [10000, 5000, 1].map((year) => ({ slug: `year-${year}`, year, calendar: 'BBD' as const, era: 'ancient' }));
  const layout = layoutTimeline(records, [era, { id: 'empty', start: { year: 0, calendar: 'ABD' }, end: { year: 10, calendar: 'ABD' } }]);
  assert.ok(layout.events[2].x - layout.events[1].x <= 280);
  assert.ok(layout.sections[1].width >= 440);
  assert.ok(layout.sections[0].ticks.length <= 14);
});

test('filters combine categories and Both requires Jedi and Sith', () => {
  const event = { era: 'exodus', factions: ['jedi', 'sith'], types: ['military', 'discovery'], importance: 'major' };
  const filters = { era: ['exodus'], faction: ['both'], type: ['discovery'], importance: ['major'] };
  assert.equal(matchesFilters(event, filters), true);
  assert.equal(matchesFilters({ ...event, factions: ['sith'] }, filters), false);
  assert.equal(matchesFilters(event, { ...filters, era: ['expansion'] }), false);
  assert.equal(matchesFilters(event, { ...filters, type: ['political', 'military'] }), true);
});

test('assets work under a repository subdirectory and at the domain root', () => {
  assert.equal(withBase('/images/events/event.webp', '/the-known-galaxy/'), '/the-known-galaxy/images/events/event.webp');
  assert.equal(withBase('images/events/event.webp', '/'), '/images/events/event.webp');
  assert.equal(withBase('', '/archive'), '/archive/');
  assert.equal(contentWithBase('<img src="/images/a.webp"><a href="https://example.com">External</a><a href="#record">Record</a>', '/archive/'), '<img src="/archive/images/a.webp"><a href="https://example.com">External</a><a href="#record">Record</a>');
});
