import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromCanonicalYear, toCanonicalYear, toCanonicalDate, formatPerspectiveDate, canonicalYearFromQuery } from '../src/utils/lore-calendar.ts';
import { currentCanonicalDate } from '../src/utils/canonical-calendar.ts';
import { layoutExperimentalTimeline, YEAR_SCALE } from '../src/utils/experimental-layout.ts';

test('both epochs, before/after transitions and current monthly dates share one canonical axis', () => {
  assert.deepEqual(toCanonicalDate(0,'ADO'),{year:16,calendar:'ABD'});
  assert.deepEqual(fromCanonicalYear(0,'ossus'),{year:16,calendar:'BDO'});
  assert.deepEqual(toCanonicalDate(17,'BDO'),{year:1,calendar:'BBD'});
  assert.equal(formatPerspectiveDate(15,'ABD','jedi'),'1 BDO');
  assert.equal(formatPerspectiveDate(16,'ABD','jedi'),'0 ADO');
  assert.equal(formatPerspectiveDate(17,'ABD','jedi'),'1 ADO');
  assert.equal(formatPerspectiveDate(22,'BBD','jedi'),'38 BDO');
  assert.equal(formatPerspectiveDate(16,'ABD','sith'),'16 ABD');
  assert.equal(formatPerspectiveDate(16,'ABD','neutral'),'16 ABD');
  for (const [timestamp,year] of [['2026-09-30T23:59:59Z',21],['2026-10-01T00:00:00Z',22],['2027-02-28T23:59:59Z',26],['2027-03-01T00:00:00Z',27]] as const) {
    const current=currentCanonicalDate(new Date(timestamp));
    assert.equal(formatPerspectiveDate(current.year,current.calendar,'jedi'),`${year} ADO`);
  }
});

test('round trips preserve every recorded and future year without a duplicate before-zero', () => {
  for (let year=-31;year<=65;year++) for (const system of ['ossus','dathomir'] as const) {
    const date=fromCanonicalYear(year,system);
    assert.equal(toCanonicalYear(date.year,date.calendar),year);
    assert.ok(date.year!==0||['ADO','ABD'].includes(date.calendar));
  }
  for (const calendar of ['BBD','BDO'] as const) assert.throws(()=>toCanonicalYear(0,calendar),/origin/);
  for (const year of [-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]) assert.throws(()=>toCanonicalYear(year,'ADO'),/integer/);
  assert.throws(()=>toCanonicalYear(Number.MAX_SAFE_INTEGER,'ADO'),/range/);
});

test('equivalent calendar inputs preserve geometry, within-year order and proportional empty years', () => {
  const dates=[[0,'ADO'],[1,'ADO'],[17,'ABD'],[49,'ADO']] as const;
  const records=dates.map(([year,calendar],index)=>({...toCanonicalDate(year,calendar),slug:`record-${index}`,timelineOrder:index,era:'history',importance:'standard' as const}));
  const layout=layoutExperimentalTimeline(records,[{id:'history',start:{year:0,calendar:'ABD'},end:{year:65,calendar:'ABD'}}],'a');
  assert.equal(layout.events[1].event.year,layout.events[2].event.year);
  assert.equal(layout.events[2].x-layout.events[1].x,YEAR_SCALE/2);
  assert.equal(layout.dateX(65,'ABD')-layout.dateX(16,'ABD'),49*YEAR_SCALE);
  assert.deepEqual(layout.events.map(item=>formatPerspectiveDate(item.event.year,item.event.calendar,'jedi')),['0 ADO','1 ADO','1 ADO','49 ADO']);
});

test('complete calendar searches resolve to exact shared dates, including zero and invalid dates', () => {
  assert.equal(canonicalYearFromQuery('0 ADO'),16);
  assert.equal(canonicalYearFromQuery('  16 abd  '),16);
  assert.equal(canonicalYearFromQuery('17 BDO'),-1);
  assert.equal(canonicalYearFromQuery('0 ABD'),0);
  assert.equal(canonicalYearFromQuery('Ossus'),null);
  assert.ok(Number.isNaN(canonicalYearFromQuery('0 BDO')));
  assert.ok(Number.isNaN(canonicalYearFromQuery('9007199254740991 ADO')));
});
