import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';

import type { ExperimentalEvent, Perspective, PerspectiveAccounts } from '../../types/experiment';

import { experimentalEras as eras } from '../../data/experimental-eras';

import { experimentalEraArt } from '../../data/experimental-era-art';

import { compareEvents, chronologyKey } from '../../utils/chronology';
import { formatPerspectiveDate, canonicalYearFromQuery } from '../../utils/lore-calendar';

import { layoutExperimentalTimeline } from '../../utils/experimental-layout';

import { resizeTimelineViewport } from '../../utils/timeline-viewport';

import { currentCanonicalDate, type CanonicalDate } from '../../utils/canonical-calendar';

import { readPerspective, perspectiveUrl, resolveAccount } from '../../utils/perspective';

import { matchesFilters } from '../../utils/filter-events';

import { withBase } from '../../utils/paths';

import { EventImage } from '../event/EventDetail';

import { ArchiveRecord } from './ArchiveRecord';

import { FactionIdentity, PerspectiveSelector } from './PerspectiveSelector';

import { FilterPanel, emptyFilters, filterCount, filterGroups as baseFilterGroups, type Filters } from '../filters/FilterPanel';

import { Icon } from '../ui/Icon';



function readHash() {

  try { return decodeURIComponent(window.location.hash.slice(1)); } catch { return ''; }

}



const filterGroups = baseFilterGroups.map(group => group.key === 'era'

  ? { ...group, options: eras.map(era => ({ id: era.id, label: era.name })) }

  : group);



export default function TimelineExperiment({ events: canonicalEvents, fixtures, accounts, concept, base, initialDate, experimental = true }: { experimental?: boolean; events: ExperimentalEvent[]; fixtures: ExperimentalEvent[]; accounts: PerspectiveAccounts; concept: 'a' | 'b'; base: string; initialDate: CanonicalDate }) {

  const [currentDate, setCurrentDate] = useState(initialDate);
  const [calendarReady, setCalendarReady] = useState(false);
  const timelineInitialized = useRef(false);

  // Recalculate on arrival: a static build must not freeze the calendar at deployment time.

  useEffect(() => {
    const refresh = () => { const date = currentCanonicalDate(); setCurrentDate(previous => previous.year === date.year && previous.calendar === date.calendar ? previous : date); };
    refresh();
    setCalendarReady(true);
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);

  const [demoMode, setDemoMode] = useState<'clusters' | 'gallery' | 'density' | 'density-five' | null>(null);

  const events = useMemo(() => demoMode ? [...canonicalEvents, ...fixtures.filter(event => demoMode === 'density' || demoMode === 'density-five' ? event.demoScenario === demoMode : demoMode === 'clusters' ? !event.demoScenario : event.slug === 'fixture-major')].sort(compareEvents) : canonicalEvents, [canonicalEvents, fixtures, demoMode]);

  const [perspective, setPerspective] = useState<Perspective>('neutral');
  const formatDate = (year: number, calendar: 'BBD' | 'ABD') => formatPerspectiveDate(year, calendar, perspective);

  const [serif, setSerif] = useState('source');

  const [routeSuffix, setRouteSuffix] = useState('');

  useEffect(() => { if (!experimental) return; const demo = new URLSearchParams(window.location.search).get('demo'); setDemoMode(demo === 'clusters' || demo === 'gallery' || demo === 'density' || demo === 'density-five' ? demo : null); }, [experimental]);

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const [filterOpen, setFilterOpen] = useState(false);

  const [query, setQuery] = useState('');

  const [searchOpen, setSearchOpen] = useState(false);

  const [searchIndex, setSearchIndex] = useState(-1);

  const [viewport, setViewport] = useState({ x: 0, width: 1 });

  const [activeEra, setActiveEra] = useState(eras.find(era => era.start.calendar === currentDate.calendar && era.start.year <= currentDate.year && (!era.end || era.end.year >= currentDate.year))?.id ?? eras[0].id);

  const [notice, setNotice] = useState('');

  const trackRef = useRef<HTMLDivElement>(null);

  const recordRef = useRef<HTMLDivElement>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  const eraNavRef = useRef<HTMLDivElement>(null);

  const titleGroupRef = useRef<HTMLDivElement>(null);

  const filtersButtonRef = useRef<HTMLButtonElement>(null);

  const resultRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const nodeRefs = useRef(new Map<string, HTMLButtonElement>());

  const dragging = useRef<{ id: number; x: number; scroll: number; moved: boolean } | null>(null);

  const suppressClick = useRef(false);

  const reducedMotion = useRef(false);

  const selected = events.find((event) => event.slug === selectedSlug);

  const selectedRef = useRef(selectedSlug);

  selectedRef.current = selectedSlug;

  const recordOpen = Boolean(selected);

  useEffect(() => { setRouteSuffix(window.location.search + window.location.hash); }, [selectedSlug, perspective, serif, demoMode]);

  const shownEras = eras;

  const layout = useMemo(() => layoutExperimentalTimeline(events, shownEras, concept, currentDate), [events, shownEras, concept, currentDate]);

  const visible = useMemo(() => events.filter((event) => matchesFilters(event, filters)), [events, filters]);

  const visibleIds = useMemo(() => new Set(visible.map((event) => event.slug)), [visible]);

  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);

  const dateQuery = canonicalYearFromQuery(query);
  const results = terms.length ? events.filter(event => { if (dateQuery !== null) return chronologyKey(event.year, event.calendar) === dateQuery; const account = resolveAccount(event, perspective, accounts); const text = `${formatDate(event.year, event.calendar)} ${event.year} ${event.calendar} ${event.searchText} ${account.title} ${account.summary} ${account.html.replace(/<[^>]+>/g, ' ')}`.toLocaleLowerCase(); return terms.every(term => text.includes(term)); }).slice(0, 12) : [];

  const activeTheme = eras.find((era) => era.id === activeEra) ?? eras[0];

  const count = filterCount(filters);

  const latestRecord = visible.at(-1);
  const sliceHasRecords = layout.events.some(item => visibleIds.has(item.event.slug) && item.x + item.width / 2 >= viewport.x && item.x - item.width / 2 <= viewport.x + viewport.width);
  const maxScroll = Math.max(0, layout.width - viewport.width);



  useEffect(() => {

    const group = titleGroupRef.current;

    const title = group?.querySelector<HTMLElement>('h1');

    const label = group?.querySelector<HTMLElement>('.timeline-perspective');

    if (!group || !title || !label) return;

    // Apply optical alignment only on the same row, including after font or label changes.

    const updateAlignment = () => { group.dataset.inlinePerspective = String(label.offsetTop < title.offsetTop + title.offsetHeight); };

    const observer = new ResizeObserver(updateAlignment);

    [group, title, label].forEach(element => observer.observe(element));

    updateAlignment();

    return () => observer.disconnect();

  }, []);



  const moveTo = useCallback((x: number, smooth = true) => {

    const track = trackRef.current;

    if (track) track.scrollTo({ left: Math.max(0, x - track.clientWidth / 2), behavior: smooth && !reducedMotion.current ? 'smooth' : 'instant' });

  }, []);



  const selectEvent = useCallback((slug: string, updateHash = true, smooth = true) => {

    const event = events.find((event) => event.slug === slug);

    if (!event) return;

    if (!matchesFilters(event, filters)) {

      setFilters(emptyFilters());

      setNotice('Filters cleared to reveal the selected record.');

    } else setNotice('');

    setSelectedSlug(slug);

    setSearchOpen(false);

    setQuery('');

    setSearchIndex(-1);

    const position = layout.events.find((item) => item.event.slug === slug);

    if (position) moveTo(position.x, smooth);

    if (updateHash && readHash() !== slug) window.history.pushState(null, '', `#${encodeURIComponent(slug)}`);

  }, [events, filters, layout, moveTo]);



  // Hash history, external hash changes, and direct record links share one selection path.

  const selectRef = useRef(selectEvent);

  selectRef.current = selectEvent;

  useEffect(() => {

    // Resolve the visitor's current month before initial positioning. Later clock
    // refreshes update labels without interrupting a reader's historical viewport.
    if (!calendarReady) return;

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');

    reducedMotion.current = media.matches;

    const updateMotion = () => { reducedMotion.current = media.matches; };

    media.addEventListener('change', updateMotion);

    function syncHash(initial = false) {

      setPerspective(readPerspective(window.location.search));

      const font = new URLSearchParams(window.location.search).get('serif');

      setSerif(experimental && (font === 'libre' || font === 'noto') ? font : 'source');

      const slug = readHash();

      if (slug === 'chronology' || slug === 'main-content') {

        if (initial) moveTo(layout.dateX(currentDate.year, currentDate.calendar), false);

        return;

      }

      if (slug && events.some((event) => event.slug === slug)) { if (initial || slug !== selectedRef.current) selectRef.current(slug, false, !initial); }

      else if (!slug) {

        setSelectedSlug(null);

        setNotice('');

        if (initial) moveTo(layout.dateX(currentDate.year, currentDate.calendar), false);

      }

      else {

        setNotice('That archive record could not be found. Select an event to continue.');

        setSelectedSlug(null);

      }

    }

    syncHash(!timelineInitialized.current);
    timelineInitialized.current = true;

    const onHash = () => syncHash();

    window.addEventListener('hashchange', onHash);

    window.addEventListener('popstate', onHash);

    return () => { media.removeEventListener('change', updateMotion); window.removeEventListener('hashchange', onHash); window.removeEventListener('popstate', onHash); };

  }, [events, currentDate, layout, moveTo, experimental, calendarReady]);



  useEffect(() => {

    if (!recordOpen) return;

    const frame = requestAnimationFrame(() => {

      recordRef.current?.querySelector<HTMLElement>('#record-title')?.focus({ preventScroll: true });

      recordRef.current?.scrollIntoView({ block: 'start', behavior: reducedMotion.current ? 'instant' : 'smooth' });

    });

    return () => cancelAnimationFrame(frame);

  }, [recordOpen]);



  function changePerspective(value: Perspective) {

    setPerspective(value);

    window.history.pushState(null, '', perspectiveUrl(window.location.href, value));

  }

  useEffect(() => {

    const nav = eraNavRef.current;

    if (!nav) return;

    const revealChapter = () => { const button = nav.querySelector<HTMLButtonElement>('[aria-current="true"]'); if (button && nav.scrollWidth > nav.clientWidth) nav.scrollTo({left: button.offsetLeft - (nav.clientWidth - button.clientWidth)/2, behavior: 'instant'}); };

    const observer = new ResizeObserver(revealChapter);

    observer.observe(nav);

    revealChapter();

    return () => observer.disconnect();

  }, [activeEra]);

  function changeSerif(value: string) {

    setSerif(value);

    const url = new URL(window.location.href);

    if (value === 'source') url.searchParams.delete('serif'); else url.searchParams.set('serif', value);

    window.history.replaceState(null, '', url.pathname + url.search + url.hash);

  }



  function closeRecord() {

    const slug = selectedSlug;

    setSelectedSlug(null);

    setNotice('');

    window.history.pushState(null, '', window.location.pathname + window.location.search);

    if (slug) nodeRefs.current.get(slug)?.focus();

  }



  useEffect(() => {

    if (selectedSlug && !visibleIds.has(selectedSlug)) {

      setSelectedSlug(null);

      setNotice('The selected record is hidden by the active filters.');

      window.history.replaceState(null, '', window.location.pathname + window.location.search);

    }

  }, [visibleIds, selectedSlug]);



  useEffect(() => {

    const track = trackRef.current;

    if (!track) return;

    let frame = 0;

    let measured = { left: track.scrollLeft, width: track.clientWidth };

    const measure = () => {

      const width = track.clientWidth;

      if (concept === 'a' && width !== measured.width) {

        track.scrollLeft = resizeTimelineViewport(measured.left, measured.width, width, layout.width);

      }

      measured = { left: track.scrollLeft, width };

      setViewport({ x: measured.left, width });

      const center = measured.left + (concept === 'a' ? Math.min(width, layout.width) : width) / 2;

      const section = layout.sections.find((section) => center >= section.x && center < section.x + section.width) ?? layout.sections.at(-1);

      if (section) setActiveEra(section.id as typeof activeEra);

    };

    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };

    // Consume only wheel movement that the timeline can actually use; page scroll

    // remains available at either boundary and everywhere outside this viewport.

    const wheel = (event: WheelEvent) => {

      if (event.ctrlKey || event.metaKey) return;

      const factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? track.clientWidth : 1;

      const delta = (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * factor;

      const next = Math.max(0, Math.min(track.scrollWidth - track.clientWidth, track.scrollLeft + delta));

      if (next !== track.scrollLeft) { event.preventDefault(); track.scrollLeft = next; }

    };

    const observer = new ResizeObserver(measure);

    observer.observe(track);

    track.addEventListener('scroll', onScroll, { passive: true });

    track.addEventListener('wheel', wheel, { passive: false });

    measure();

    return () => { observer.disconnect(); cancelAnimationFrame(frame); track.removeEventListener('scroll', onScroll); track.removeEventListener('wheel', wheel); };

  }, [layout, concept]);



  useEffect(() => {

    const shortcut = (event: globalThis.KeyboardEvent) => {

      const target = event.target as HTMLElement;

      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !target.closest('input,textarea,select,[contenteditable="true"]')) { event.preventDefault(); searchRef.current?.focus(); setSearchOpen(true); }

    };

    window.addEventListener('keydown', shortcut);

    return () => window.removeEventListener('keydown', shortcut);

  }, []);



  function timelineKey(event: KeyboardEvent<HTMLDivElement>) {

    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;

    event.preventDefault();

    const track = trackRef.current!;

    const node = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-event], [data-event-anchor]');

    const slug = node?.dataset.event ?? node?.dataset.eventAnchor;

    if (slug) {

      const index = visible.findIndex((record) => record.slug === slug);

      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1 : Math.max(0, Math.min(visible.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)));

      const next = visible[nextIndex];

      if (next) { selectEvent(next.slug); nodeRefs.current.get(next.slug)?.focus({ preventScroll: true }); }

    } else track.scrollTo({ left: event.key === 'Home' ? 0 : event.key === 'End' ? track.scrollWidth : track.scrollLeft + (event.key === 'ArrowRight' ? 1 : -1) * track.clientWidth * .65, behavior: reducedMotion.current ? 'instant' : 'smooth' });

  }



  function pointerDown(event: PointerEvent<HTMLDivElement>) {

    if (event.pointerType !== 'mouse' || event.button !== 0) return; // Touch uses native panning.

    suppressClick.current = false;

    dragging.current = { id: event.pointerId, x: event.clientX, scroll: event.currentTarget.scrollLeft, moved: false };

  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {

    const drag = dragging.current;

    if (!drag || event.pointerId !== drag.id || !(event.buttons & 1)) return;

    const delta = event.clientX - drag.x;

    if (Math.abs(delta) > 6) {

      drag.moved = true;

      suppressClick.current = true;

      event.currentTarget.setPointerCapture(event.pointerId);

      event.currentTarget.classList.add('is-dragging');

      event.currentTarget.scrollLeft = drag.scroll - delta;

    }

  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {

    dragging.current = null;

    event.currentTarget.classList.remove('is-dragging');

    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);

  }

  function searchKey(event: KeyboardEvent<HTMLInputElement>) {

    if (event.key === 'Escape') { setSearchOpen(false); setSearchIndex(-1); }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {

      event.preventDefault(); setSearchOpen(true);

      const index = results.length ? (searchIndex + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length : -1;

      setSearchIndex(index);

      resultRefs.current[index]?.scrollIntoView({ block: 'nearest' });

    }

    if (event.key === 'Enter' && results.length) { event.preventDefault(); selectEvent(results[Math.max(0, searchIndex)].slug); trackRef.current?.focus({ preventScroll: true }); }

  }



  return <div className={`archive-app experiment concept-${concept} perspective-${perspective} serif-${serif}`} style={{ '--era-accent': activeTheme.theme.accent, '--axis-y': `${layout.axisY}px` } as CSSProperties}>

    {experimental && <div className="experiment-bar"><a href={withBase('compare/', base)}>Design experiment</a><span>Concept {concept.toUpperCase()}{demoMode === 'density-five' ? ' · five-event-month stress preview · 37–65 ABD · test content' : demoMode === 'density' ? ` · density preview · 4 records/year · ${formatDate(15, 'ABD')}–${formatDate(25, 'ABD')} · test content` : demoMode ? ' · synthetic fixtures enabled' : ''}</span><a href={`${withBase(`concept-${concept === 'a' ? 'b' : 'a'}/`, base)}${routeSuffix}`}>Compare {concept === 'a' ? 'B' : 'A'}</a><label>Title face <select aria-label="Historical title font" value={serif} onChange={e => changeSerif(e.target.value)}><option value="source">Source Serif 4</option><option value="libre">Libre Baskerville</option><option value="noto">Noto Serif</option></select></label></div>}

    <header className="site-header">

      <a className="brand" href={withBase(experimental ? `concept-${concept}/` : '', base)} aria-label="The Known Galaxy archive home"><img src={withBase('images/branding/tkg-logo.png', base)} width="2299" height="894" alt="The Known Galaxy" /></a>

      <PerspectiveSelector value={perspective} onChange={changePerspective} base={base} />

      <div className="header-tools">

        <div className="search" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSearchOpen(false); }}>

          <Icon name="search" /><input ref={searchRef} aria-label="Search archive" role="combobox" aria-autocomplete="list" aria-controls={searchOpen && terms.length ? 'search-results' : undefined} aria-expanded={searchOpen && Boolean(terms.length)} aria-activedescendant={searchIndex >= 0 && searchOpen ? `search-result-${searchIndex}` : undefined} placeholder="Search history" value={query} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); setSearchIndex(-1); }} onFocus={() => setSearchOpen(true)} onKeyDown={searchKey} />

          {searchOpen && terms.length > 0 && <div className="search-popover"><p>{results.length ? 'Matching archive records' : 'No records found'}<span>Search includes people, places, and full lore.</span></p><ul id="search-results" role="listbox" aria-label="Archive search results">{results.map((event, index) => <li key={event.slug} id={`search-result-${index}`} role="option" aria-selected={index === searchIndex}><button ref={(element) => { resultRefs.current[index] = element; }} className={searchIndex === index ? 'search-active' : ''} onClick={() => selectEvent(event.slug)}><span className="event-date">{formatDate(event.year, event.calendar)}</span><strong>{resolveAccount(event, perspective, accounts).title}</strong>{event.demo && <small>Demo · noncanonical</small>}</button></li>)}</ul>{count > 0 && <small className="search-filter-note">Selecting a hidden record clears conflicting filters.</small>}</div>}

        </div>

        <button ref={filtersButtonRef} aria-label="Filters" className={`filters-button ${count ? 'has-filters' : ''}`} aria-haspopup="dialog" aria-expanded={filterOpen} onClick={() => setFilterOpen(true)}><Icon name="filter" /><span>Filters</span>{count > 0 && <span className="filter-count">{count}</span>}</button>

      </div>

    </header>

    <main id="main-content">

      <section id="chronology" className="chronology-section" aria-labelledby="chronology-title">

        <div className="chronology-heading"><div className="chronology-title-group" ref={titleGroupRef}><h1 id="chronology-title">Lore timeline</h1><span className="timeline-perspective" id="perspective-description">{perspective === 'neutral' ? 'Canonical account' : perspective === 'jedi' ? 'Jedi perspective' : 'Sith perspective'}</span></div></div>

        <div ref={eraNavRef} className="era-navigation" aria-label="Jump to era" style={{ gridTemplateColumns: `repeat(${shownEras.length}, minmax(0, 1fr))` }}>{shownEras.map((era) => <button key={era.id} className={activeEra === era.id ? 'active-era' : ''} aria-current={activeEra === era.id ? 'true' : undefined} onClick={() => { const section = layout.sections.find((section) => section.id === era.id)!; moveTo(section.x + section.width / 2); }}><span>{era.name}</span><small>{formatDate(era.start.year, era.start.calendar)} — {era.end ? formatDate(era.end.year, era.end.calendar) : formatDate(layout.end, 'ABD')}</small></button>)}</div>

        <div className="timeline-toolbar"><div><span className="era-indicator">{activeTheme.name}</span><span className="record-count" role="status">{visible.length} of {events.length} records</span></div><div className="timeline-controls"><button className="timeline-jump" onClick={() => moveTo(layout.dateX(currentDate.year, currentDate.calendar))}>Current year</button><button className="timeline-jump" disabled={!latestRecord} onClick={() => { const item = layout.events.find(item => item.event.slug === latestRecord?.slug); if (item) moveTo(item.x); }}>Latest record</button><button className="icon-button" aria-label="Previous timeline viewport" disabled={viewport.x < 1} onClick={() => trackRef.current?.scrollBy({ left: -viewport.width * .7, behavior: reducedMotion.current ? 'instant' : 'smooth' })}><Icon name="left" /></button><button className="icon-button" aria-label="Next timeline viewport" disabled={viewport.x >= maxScroll - 1} onClick={() => trackRef.current?.scrollBy({ left: viewport.width * .7, behavior: reducedMotion.current ? 'instant' : 'smooth' })}><Icon name="right" /></button></div></div>

        {count > 0 && <div className="active-filters">{filterGroups.flatMap((group) => filters[group.key].map((id) => <button key={`${group.key}-${id}`} onClick={() => setFilters({ ...filters, [group.key]: filters[group.key].filter((value) => value !== id) })} aria-label={`Remove ${group.options.find((option) => option.id === id)?.label} filter`}>{group.options.find((option) => option.id === id)?.label}<Icon name="close" /></button>))}<button className="clear-filters" onClick={() => setFilters(emptyFilters())}>Clear all</button></div>}

        <p id="timeline-help" className="sr-only">Scroll or drag horizontally to explore. On touch devices, swipe. Use Left and Right arrows, Home and End. Tab to an event and press Enter to open its record.</p>

        <div ref={trackRef} className="timeline-viewport" tabIndex={0} role="region" aria-label="Interactive lore timeline" aria-describedby="timeline-help" onKeyDown={timelineKey} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={() => { dragging.current = null; trackRef.current?.classList.remove('is-dragging'); }} onPointerLeave={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) dragging.current = null; }} onClickCapture={(event) => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}>

          <div className="timeline-track" style={{ width: layout.width, height: layout.height }}>

            {viewport.width > 1 && visible.length > 0 && !sliceHasRecords && <p className="viewport-empty" style={{left: viewport.x, width: Math.min(viewport.width, layout.width)}}>No approved records in this part of the timeline. Use Latest record to return to recorded history.</p>}

            <span className="perspective-atmosphere" aria-hidden="true" style={{ left: viewport.x, width: Math.min(viewport.width, layout.width) }} />

            <div className="chapter-atmospheres" aria-hidden="true">

              {layout.sections.map(section => {

                const era = eras.find(e => e.id === section.id)!;

                const art = experimentalEraArt[era.id];

                // Neighbouring fades overlap across the boundary instead of clipping there.

                const blend = Math.min(layout.yearScale, section.width / 4);

                return <span className="chapter-atmosphere" key={section.id} style={{left: section.x - blend, width: section.width + blend * 2, '--chapter-feather': `${blend * 2}px`, backgroundImage: art ? `url(${withBase(art, base)})` : `radial-gradient(ellipse at 65% 40%, rgba(${era.theme.atmosphere}, .09), transparent 66%)` } as CSSProperties} />;

              })}

            </div>

            <div className="chronology-axis" aria-hidden="true" />

            {layout.sections.map((section) => { const era = eras.find((era) => era.id === section.id)!; return <div key={section.id} className="era-section" style={{ left: section.x, width: section.width, '--section-accent': era.theme.accent } as CSSProperties}><span className="era-boundary" aria-hidden="true" /><span className="era-watermark" aria-hidden="true">{era.name}</span>{!events.some((event) => event.era === era.id) && <span className="unrecorded-era">No approved records in this era yet.</span>}{section.ticks.map((tick) => { const current = tick.year === currentDate.year && tick.calendar === currentDate.calendar; return <span className={`chronology-tick${current ? ' current-year-tick' : ''}`} aria-current={current ? 'date' : undefined} key={`${tick.year}-${tick.calendar}`} style={{ left: tick.x }}><i /><span>{formatDate(tick.year, tick.calendar)}{current && <small>Current year</small>}</span></span>; })}</div>; })}

            <svg className="chronicle-leaders" width={layout.width} height={layout.height} aria-hidden="true">
              {layout.events.filter(item => visibleIds.has(item.event.slug)).map(item => <path key={item.event.slug} className={`${selectedSlug === item.event.slug ? 'selected-leader' : ''} faction-${item.event.factions.length > 1 ? 'both' : item.event.factions[0]}`} d={item.leaderPath} />)}
              {layout.events.filter(item => visibleIds.has(item.event.slug)).map(item => {
                const selected = selectedSlug === item.event.slug;
                return <g key={item.event.slug} data-event-orb={item.event.slug} className={`event-orb faction-${item.event.factions.length > 1 ? 'both' : item.event.factions[0]} ${selected ? 'selected-anchor' : ''} ${item.event.importance === 'major' ? 'major-anchor' : ''}`}>
                  {selected && <circle className="orb-ring" cx={item.x} cy={layout.axisY} r={11} />}
                  <circle className="orb-dot" cx={item.x} cy={layout.axisY} r={selected ? 7 : item.event.importance === 'major' ? 6 : 4} />
                </g>;
              })}
            </svg>

            {layout.events.filter(item => visibleIds.has(item.event.slug)).map(item => <button

              key={item.event.slug} className={`event-anchor faction-${item.event.factions.length > 1 ? 'both' : item.event.factions[0]} ${item.event.slug === selectedSlug ? 'selected-anchor' : ''} ${item.event.importance === 'major' ? 'major-anchor' : ''}`}

              tabIndex={-1} style={{ left: item.x - Math.min(24, layout.yearScale / item.slots) / 2, top: layout.axisY - 12, width: Math.min(24, layout.yearScale / item.slots) }} data-event-anchor={item.event.slug}

              aria-label={`Open ${formatDate(item.event.year, item.event.calendar)} record: ${resolveAccount(item.event, perspective, accounts).title}${item.slots > 1 ? `, event ${item.slot + 1} of ${item.slots}` : ''}`}

              aria-pressed={item.event.slug === selectedSlug} onClick={() => selectEvent(item.event.slug)} />)}

            {layout.events.map(item => { const {event} = item; if (!visibleIds.has(event.slug)) return null; const account = resolveAccount(event, perspective, accounts); const cardImage = event.image ? event : event.gallery?.[0] ? {...event, image:event.gallery[0].image, imageAlt:event.gallery[0].alt} : undefined; const quiet = perspective !== 'neutral' && !event.factions.includes(perspective); return <button key={event.slug} ref={element => { if (element) nodeRefs.current.set(event.slug, element); else nodeRefs.current.delete(event.slug); }} data-event={event.slug} data-anchor-x={item.x} data-row={item.row} title={`${account.title} · ${event.importance[0].toUpperCase() + event.importance.slice(1)} event`} className={`chronicle-event importance-${event.importance} faction-${event.factions.length > 1 ? 'both' : event.factions[0]} ${selectedSlug === event.slug ? 'selected' : ''} ${selected?.relatedEvents.includes(event.slug) ? 'related' : ''} ${quiet ? 'quiet-event' : ''}`} style={{ left: item.labelX - item.width / 2, top: item.y, width: item.width, height: item.height }} aria-pressed={selectedSlug === event.slug} aria-label={`${formatDate(event.year, event.calendar)}: ${account.title}, ${event.importance} event${item.slots > 1 ? `, event ${item.slot + 1} of ${item.slots}` : ''}${event.demo ? ', demonstration, noncanonical' : ''}`} onClick={() => selectEvent(event.slug)}><span className="chronicle-label" onDragStart={e => e.preventDefault()}><span className="event-date">{formatDate(event.year, event.calendar)}</span>{cardImage && event.importance === 'major' && <EventImage event={cardImage} base={base} compact />}<span className="event-title">{account.title}</span><FactionIdentity factions={event.factions} base={base} />{selected?.relatedEvents.includes(event.slug) && <span className="related-indicator">Related to open record</span>}{event.demo && <span className="fixture-marker">Test fixture</span>}</span></button>; })}

          </div>

        </div>

        {!visible.length && <div className="timeline-empty" role="status">No records match these filters.<button className="text-button" onClick={() => setFilters(emptyFilters())}>Clear filters<Icon name="right" /></button></div>}

        <div className="overview"><div className="overview-track" aria-hidden="true">{layout.sections.map((section) => <span className="overview-era" key={section.id} style={{ left: `${section.x / layout.width * 100}%`, width: `${section.width / layout.width * 100}%` }} />)}{layout.events.filter(({ event }) => visibleIds.has(event.slug)).map(({ event, x }) => <i key={event.slug} className={`overview-node faction-${event.factions.length > 1 ? 'both' : event.factions[0]}`} style={{ left: `${x / layout.width * 100}%` }} />)}<span className="overview-window" style={{ left: `${viewport.x / layout.width * 100}%`, width: `${Math.min(100, viewport.width / layout.width * 100)}%` }} /></div><input type="range" min="0" max="1000" value={maxScroll ? Math.round(viewport.x / maxScroll * 1000) : 0} disabled={!maxScroll} aria-label="Timeline overview position" aria-valuetext={`${activeTheme.name}, ${Math.round(maxScroll ? viewport.x / maxScroll * 100 : 0)} percent through chronology`} onChange={(event) => { if (trackRef.current) trackRef.current.scrollLeft = Number(event.target.value) / 1000 * maxScroll; }} /></div>

        <div className="timeline-footnote"><span>Earlier<Icon name="right" />Later</span><span>Current year: {formatDate(currentDate.year, currentDate.calendar)}</span><details className="calendar-help"><summary>{perspective === 'jedi' ? 'BDO / ADO' : 'BBD / ABD'}</summary><p>{perspective === 'jedi' ? 'Before / After the Destruction of Ossus. Ossus is 0 ADO = 16 ABD.' : 'Before / After the Battle of Dathomir. Dathomir is 0 ABD = 16 BDO.'} One real calendar month equals one canonical year; years advance at midnight UTC on the first of each month.</p></details></div>

      </section>

      <p className={`archive-notice ${notice ? '' : 'sr-only'}`} role="status">{notice}</p>

      {selected && <div className="record-wrap" ref={recordRef}><ArchiveRecord key={selected.slug} event={selected} events={events} perspective={perspective} accounts={accounts} base={base} onSelect={selectEvent} onClose={closeRecord} /></div>}

      <p className="sr-only" role="status">{selected ? `Selected record: ${formatDate(selected.year, selected.calendar)}, ${resolveAccount(selected, perspective, accounts).title}` : ''}</p>

    </main>

    <footer className="site-footer"><span>The Known Galaxy</span></footer>

    <FilterPanel open={filterOpen} onClose={() => { setFilterOpen(false); filtersButtonRef.current?.focus({ preventScroll: true }); }} filters={filters} onChange={setFilters} visible={visible.length} total={events.length} groups={filterGroups} />

  </div>;

}
