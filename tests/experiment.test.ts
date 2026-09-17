import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutExperimentalTimeline, YEAR_SCALE } from '../src/utils/experimental-layout.ts';
import { readPerspective, perspectiveUrl, resolveAccount } from '../src/utils/perspective.ts';
import { gallerySchema, perspectiveSchema } from '../src/data/perspective-schema.ts';
import { resizeTimelineViewport } from '../src/utils/timeline-viewport.ts';
import { densityFixtures } from '../src/data/density-fixtures.ts';
import type { ExperimentalEvent } from '../src/types/experiment';
import { currentCanonicalDate } from '../src/utils/canonical-calendar.ts';
const eras = [{ id: 'before', start: { year: 20, calendar: 'BBD' as const }, end: { year: 1, calendar: 'BBD' as const } }, { id: 'after', start: { year: 0, calendar: 'ABD' as const }, end: { year: 9, calendar: 'ABD' as const } }];
const record = (slug: string, year: number, importance: 'major'|'standard'|'minor' = 'standard', timelineOrder = 0) => ({ slug, year: Math.abs(year), calendar: (year < 0 ? 'BBD' : 'ABD') as 'BBD'|'ABD', era: year < 0 ? 'before' : 'after', importance, timelineOrder });
test('canonical years advance at calendar month boundaries, including short months and new years', () => {
  for (const [timestamp,year] of [
    ['2026-09-01T00:00:00Z',37],['2026-09-30T23:59:59Z',37],
    ['2026-10-01T00:00:00Z',38],['2026-11-01T00:00:00Z',39],
    ['2026-12-31T23:59:59Z',40],['2027-01-01T00:00:00Z',41],
    ['2027-02-28T23:59:59Z',42],['2027-03-01T00:00:00Z',43],
    ['2028-02-29T23:59:59Z',54],['2028-03-01T00:00:00Z',55],
  ] as const) assert.deepEqual(currentCanonicalDate(new Date(timestamp)),{year,calendar:'ABD'});
});
test('density preview fills 15–25 ABD to four total records/year and preserves existing records', () => {
  const canonical = [record('ossus',16,'major'), record('dawn',17,'major'), record('party',17,'minor',1), record('bombing',17,'standard',2), record('tiberius',20,'major'), record('outside',27), record('before',-20)] as ExperimentalEvent[];
  const before = structuredClone(canonical);
  const fixtures = densityFixtures(canonical);
  const all = [...canonical, ...fixtures];
  assert.equal(fixtures.length,39);
  assert.equal(new Set(all.map(event => event.slug)).size,all.length);
  for (let year=15;year<=25;year++) {
    const records = all.filter(event => event.calendar === 'ABD' && event.year === year);
    assert.equal(records.length,4,`${year} ABD must contain four total records`);
    assert.equal(new Set(records.map(event => event.timelineOrder)).size,4);
  }
  assert.deepEqual(canonical,before);
  assert.ok(fixtures.every(event => event.demo && event.demoScenario === 'density' && event.calendar === 'ABD' && event.year >= 15 && event.year <= 25));
  assert.deepEqual(new Set(fixtures.map(event => event.importance)),new Set(['major','standard','minor']));
  // The production collection and other demonstration modes never receive these records.
  assert.equal(canonical.some(event => event.demoScenario === 'density'),false);
});
test('viewport resizing preserves the viewed year, clamps at boundaries and centers a complete chronology', () => {
  const wider = resizeTimelineViewport(2500, 1200, 2000, 6120);
  assert.equal(wider + 1000, 2500 + 600);
  assert.equal(resizeTimelineViewport(wider, 2000, 1200, 6120), 2500);
  assert.equal(resizeTimelineViewport(0, 1200, 2000, 6120), 0);
  assert.equal(resizeTimelineViewport(4920, 1200, 2000, 6120), 4120);
  assert.equal(resizeTimelineViewport(2500, 1200, 8000, 6120), 0);
  assert.equal(resizeTimelineViewport(0, 8000, 1200, 6120), (6120 - 1200) / 2);
});
test('four events every consecutive year fit in two rows per side without compressing empty history', () => {
  const records = Array.from({length:11},(_,year) => Array.from({length:4},(_,slot) => record(`year-${year}-${slot}`,year+15,(['major','standard','standard','minor'] as const)[slot],slot))).flat();
  const era = [{id:'after',start:{year:0,calendar:'ABD' as const},end:{year:30,calendar:'ABD' as const}}];
  const layout = layoutExperimentalTimeline(records,era,'a');
  assert.equal(layout.yearScale,YEAR_SCALE);
  assert.equal(new Set(layout.events.filter(event=>event.lane==='above').map(event=>event.row)).size,2);
  assert.equal(new Set(layout.events.filter(event=>event.lane==='below').map(event=>event.row)).size,2);
  assert.ok(layout.height<=600, 'Four records/year must leave room for navigation on desktop');
  assert.ok(layout.events.every(item=>item.y>=48), 'The era heading must have its own space above all cards');
  assert.equal(layout.events.find(event=>event.event.slug==='year-1-0')!.x-layout.events.find(event=>event.event.slug==='year-0-0')!.x,YEAR_SCALE);
  assert.equal(layout.sections[0].ticks.length,31);
  for (let i=1;i<layout.events.length;i++) assert.equal(layout.events[i].x-layout.events[i-1].x,YEAR_SCALE/4);
  assert.equal(layout.events[0].x,layout.dateX(15,'ABD')-YEAR_SCALE*3/8);
  assert.equal(layout.events.at(-1)!.x,layout.dateX(25,'ABD')+YEAR_SCALE*3/8);
  // Removing events does not remove years or shorten the axis.
  const sparse = layoutExperimentalTimeline([records[0],records.at(-1)!],era,'a');
  assert.equal(sparse.width,layout.width);
  assert.equal(sparse.events[1].x-sparse.events[0].x,10*YEAR_SCALE);
  assert.equal(sparse.dateX(20,'ABD'),sparse.events[0].x+5*YEAR_SCALE);
  assert.equal(sparse.dateX(1,'ABD')-sparse.dateX(1,'BBD'),2*YEAR_SCALE);
  const future = layoutExperimentalTimeline([], [{id:'future',start:{year:41,calendar:'ABD'},end:null}], 'a', {year:50,calendar:'ABD'});
  assert.equal(future.end,54);
  assert.equal(future.dateX(51,'ABD')-future.dateX(50,'ABD'),YEAR_SCALE);
  assert.ok(future.dateX(50,'ABD')+750<future.width);
});
test('larger image cards preserve chronology and fit four major events per year without extra rows', () => {
  const records = Array.from({length:11},(_,year) => Array.from({length:4},(_,slot) => record(`image-${year}-${slot}`,year+15,'major',slot))).flat();
  const plain = layoutExperimentalTimeline(records,eras,'a');
  const illustrated = layoutExperimentalTimeline(records.map(event=>({...event,image:'/images/test.webp'})),eras,'a');
  const galleryCovers = layoutExperimentalTimeline(records.map(event=>({...event,gallery:[{image:'/images/test.webp',alt:'Synthetic cover'}]})),eras,'a');
  assert.deepEqual(galleryCovers.events.map(item=>[item.width,item.x,item.y]),illustrated.events.map(item=>[item.width,item.x,item.y]));
  assert.equal(illustrated.height,plain.height);
  assert.equal(illustrated.width,plain.width);
  assert.deepEqual(illustrated.events.map(item=>item.x),plain.events.map(item=>item.x));
  for (let i=0;i<illustrated.events.length;i++) for (let j=i+1;j<illustrated.events.length;j++) {
    const a=illustrated.events[i],b=illustrated.events[j];
    const horizontal = Math.abs(a.labelX-b.labelX) < (a.width+b.width)/2;
    const vertical = a.y < b.y+b.height && b.y < a.y+a.height;
    assert.equal(horizontal && vertical,false,`${a.event.slug} collides with ${b.event.slug}`);
  }
});

test('five-event months fit a compact canvas with image-bearing major records and no collisions', () => {
  const fixtures = densityFixtures([{ ...record('reference', 0, 'major'), image: '/images/test.webp' }] as ExperimentalEvent[], 5, 37, 65);
  const layout = layoutExperimentalTimeline(fixtures, [{ id: 'future', start: { year: 0, calendar: 'ABD' }, end: { year: 65, calendar: 'ABD' } }], 'a');
  assert.equal(fixtures.length, 145);
  assert.ok(fixtures.some(event => event.image));
  assert.ok(layout.height <= 600, `Five events per month require ${layout.height}px`);
  for (let year = 37; year <= 65; year++) assert.equal(fixtures.filter(event => event.year === year).length, 5);
  for (let i = 0; i < layout.events.length; i++) for (let j = i + 1; j < layout.events.length; j++) {
    const a = layout.events[i], b = layout.events[j];
    assert.equal(Math.abs(a.x - b.x) < (a.width + b.width) / 2 && a.y < b.y + b.height && b.y < a.y + a.height, false, `${a.event.slug} overlaps ${b.event.slug}`);
  }
});

test('Uncharted Territory retains the initial horizon and advances with current canon and records', () => {
  const eras = [{ id: 'to-be-determined', start: { year: 41, calendar: 'ABD' as const }, end: null }];
  assert.equal(layoutExperimentalTimeline([], eras, 'a', { year: 37, calendar: 'ABD' }).end, 65);
  const later = layoutExperimentalTimeline([], eras, 'a', { year: 65, calendar: 'ABD' });
  assert.equal(later.end, 69);
  const recorded = layoutExperimentalTimeline([{ ...record('future', 75), era: 'to-be-determined' }], eras, 'a');
  assert.equal(recorded.end, 75);
  assert.equal(recorded.sections[0].ticks.at(-1)?.year, 75);
  assert.equal(later.sections[0].width, 29 * YEAR_SCALE);
});

for (const concept of ['a','b'] as const) {
  test(`${concept}: distance is honest through origin, empty periods, dense years and filters`, () => {
    const events = [record('old', -20), record('before', -1), record('origin', 0), ...Array.from({length: 4},(_,i) => record(`same-${i}`, 1, i === 0 ? 'major' : i === 3 ? 'minor' : 'standard', i)), record('next', 2), record('late', 9)];
    const layout = layoutExperimentalTimeline(events, eras, concept);
    const x = (slug: string) => layout.events.find(item => item.event.slug === slug)!.x;
    assert.equal(x('before') - x('old'), 19 * YEAR_SCALE);
    assert.equal(x('origin') - x('before'), YEAR_SCALE);
    assert.equal(layout.dateX(2,'ABD') - layout.dateX(1,'ABD'), YEAR_SCALE);
    assert.equal(x('late') - x('next'), 7 * YEAR_SCALE);
    assert.equal(layout.sections[0].width / layout.sections[1].width, 2);
    const anchor = x('same-0');
    for (let i=0;i<4;i++) { const item = layout.events.find(item => item.event.slug === `same-${i}`)!; assert.equal(item.x, layout.dateX(1,'ABD') + ((i + .5)/4 - .5)*YEAR_SCALE); assert.equal(item.labelX,item.x); assert.equal(item.slot,i); assert.equal(item.slots,4); }
    // Rendering filters select from this complete geometry, never reconstruct it.
    const filtered = layout.events.filter(item => ['same-0','late'].includes(item.event.slug));
    assert.equal(filtered[0].x, anchor); assert.equal(filtered[1].x, x('late'));
    for (const item of layout.events) { assert.ok(item.y >= 0); assert.ok(item.y + item.height <= layout.height); assert.ok(item.labelX - item.width/2 >= 0); assert.ok(item.labelX + item.width/2 <= layout.width); }
    for (let i=0;i<layout.events.length;i++) for (let j=i+1;j<layout.events.length;j++) {
      const a=layout.events[i],b=layout.events[j];
      const horizontal = Math.abs(a.labelX-b.labelX) < (a.width+b.width)/2;
      const vertical = a.y < b.y+b.height && b.y < a.y+a.height;
      assert.equal(horizontal && vertical, false, `${a.event.slug} collides with ${b.event.slug}`);
    }
  });
  test(`${concept}: adding many same-year records increases vertical extent, not historical width`, () => {
    const one = layoutExperimentalTimeline([record('one',4)], eras, concept);
    const dense = layoutExperimentalTimeline(Array.from({length:40},(_,i)=>record(`r-${i}`,4,'major',i)),eras,concept);
    assert.equal(one.width,dense.width); assert.equal(one.events[0].x,one.dateX(4,'ABD')); assert.ok(dense.height > one.height);
    assert.equal(new Set(dense.events.map(e=>e.x)).size,40);
    assert.ok(dense.events.every(item=>Math.abs(item.x-dense.dateX(4,'ABD'))<YEAR_SCALE/2));
  });
}
test('perspective URL preserves selected event and unrelated parameters; omitted value is Neutral', () => {
  assert.equal(readPerspective(''), 'neutral'); assert.equal(readPerspective('?perspective=unknown'), 'neutral');
  const url='https://example.test/the-known-galaxy/concept-b/?demo=clusters#event';
  const jedi=perspectiveUrl(url,'jedi'); assert.equal(jedi,'/the-known-galaxy/concept-b/?demo=clusters&perspective=jedi#event');
  assert.equal(perspectiveUrl('https://example.test'+jedi,'neutral'),'/the-known-galaxy/concept-b/?demo=clusters#event');
});
test('separate written accounts override narrative only and otherwise fall back honestly', () => {
  const neutral={slug:'fixture',title:'Neutral fixture',summary:'Test summary',html:'<p>Neutral test body</p>',year:4};
  const accounts=[{event:'fixture',perspective:'jedi' as const,title:'Jedi test fixture',html:'<p>Synthetic alternative used only by this test</p>'}];
  assert.equal(resolveAccount(neutral,'neutral',accounts).title,neutral.title);
  const alternate=resolveAccount(neutral,'jedi',accounts); assert.equal(alternate.title,'Jedi test fixture'); assert.equal(alternate.summary,neutral.summary); assert.equal(alternate.fallback,false);
  const fallback=resolveAccount(neutral,'sith',accounts); assert.equal(fallback.html,neutral.html); assert.equal(fallback.fallback,true);
  assert.equal(neutral.year,4);
});
test('gallery requires local safe paths and meaningful alt; perspective cannot duplicate metadata', () => {
  assert.equal(gallerySchema.safeParse([{image:'/images/test.webp',alt:'A supplied test image',caption:'Optional caption'}]).success,true);
  for(const image of [{image:'/images/../escape.webp',alt:'Test'}, {image:'https://example.test/image.jpg',alt:'Test'}, {image:'/images/test.webp',alt:' '}]) assert.equal(gallerySchema.safeParse([image]).success,false);
  assert.equal(perspectiveSchema.safeParse({event:'fixture',perspective:'jedi',year:4}).success,false);
  assert.equal(perspectiveSchema.safeParse({event:'fixture',perspective:'sith',title:'Synthetic title'}).success,true);
});


test('variable slot counts stay inside their year and respect saved order regardless of input order', () => {
  const events = [record('last',2,'minor',9), record('first',2,'major',-2), record('middle',2,'standard',4), record('single',3)];
  const layout=layoutExperimentalTimeline(events,eras,'a');
  assert.deepEqual(layout.events.map(item=>item.event.slug),['first','middle','last','single']);
  for (let slot=0;slot<3;slot++) {
    const item=layout.events[slot];
    assert.ok(Math.abs(item.x-(layout.dateX(2,'ABD')+((slot+.5)/3-.5)*YEAR_SCALE))<1e-9);
  }
  assert.equal(layout.events[3].x,layout.dateX(3,'ABD'));
  // A view filter retains the original slot, including its original ordinal count.
  const filtered=layout.events.filter(item=>item.event.slug==='middle');
  assert.equal(filtered[0].slot,1); assert.equal(filtered[0].slots,3);
});
