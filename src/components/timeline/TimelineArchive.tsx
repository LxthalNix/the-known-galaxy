import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import type { LoreEvent } from '../../types/events';
import { eras } from '../../data/eras';
import { formatDate } from '../../utils/chronology';
import { layoutTimeline } from '../../utils/timeline-layout';
import { matchesFilters } from '../../utils/filter-events';
import { withBase } from '../../utils/paths';
import { EventDetail, EventImage, FactionBadge } from '../event/EventDetail';
import { FilterPanel, emptyFilters, filterCount, filterGroups, type Filters } from '../filters/FilterPanel';
import { Icon } from '../ui/Icon';

function readHash() {
  try { return decodeURIComponent(window.location.hash.slice(1)); } catch { return ''; }
}

export default function TimelineArchive({ events, base }: { events: LoreEvent[]; base: string }) {
  const defaultEvent = events.find((event) => event.slug === 'purge-of-dathomir') ?? events[0];
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchIndex, setSearchIndex] = useState(-1);
  const [viewport, setViewport] = useState({ x: 0, width: 1 });
  const [activeEra, setActiveEra] = useState(defaultEvent?.era ?? eras[0].id);
  const [notice, setNotice] = useState('');
  const trackRef = useRef<HTMLDivElement>(null);
  const recordRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const filtersButtonRef = useRef<HTMLButtonElement>(null);
  const resultRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>());
  const dragging = useRef<{ id: number; x: number; scroll: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const reducedMotion = useRef(false);
  const selected = events.find((event) => event.slug === selectedSlug);
  const recordOpen = Boolean(selected);
  const shownEras = useMemo(() => eras.filter((era) => era.end !== null || events.some((event) => event.era === era.id)), [events]);
  const layout = useMemo(() => layoutTimeline(events, shownEras), [events, shownEras]);
  const visible = useMemo(() => events.filter((event) => matchesFilters(event, filters)), [events, filters]);
  const visibleIds = useMemo(() => new Set(visible.map((event) => event.slug)), [visible]);
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const results = terms.length ? events.filter((event) => terms.every((term) => event.searchText.includes(term))).slice(0, 12) : [];
  const activeTheme = eras.find((era) => era.id === activeEra) ?? eras[0];
  const count = filterCount(filters);
  const maxScroll = Math.max(0, layout.width - viewport.width);

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
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion.current = media.matches;
    const updateMotion = () => { reducedMotion.current = media.matches; };
    media.addEventListener('change', updateMotion);
    function syncHash(initial = false) {
      const slug = readHash();
      if (slug === 'chronology' || slug === 'main-content') {
        if (initial && defaultEvent) moveTo(layout.events.find((item) => item.event.slug === defaultEvent.slug)?.x ?? 0, false);
        return;
      }
      if (slug && events.some((event) => event.slug === slug)) selectRef.current(slug, false, !initial);
      else if (!slug) {
        setSelectedSlug(null);
        setNotice('');
        if (initial && defaultEvent) moveTo(layout.events.find((item) => item.event.slug === defaultEvent.slug)?.x ?? 0, false);
      }
      else {
        setNotice('That archive record could not be found. Select an event to continue.');
        setSelectedSlug(null);
      }
    }
    syncHash(true);
    const onHash = () => syncHash();
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onHash);
    return () => { media.removeEventListener('change', updateMotion); window.removeEventListener('hashchange', onHash); window.removeEventListener('popstate', onHash); };
  }, [events, defaultEvent, layout, moveTo]);

  useEffect(() => {
    if (!recordOpen) return;
    const frame = requestAnimationFrame(() => {
      recordRef.current?.querySelector<HTMLElement>('#record-title')?.focus({ preventScroll: true });
      recordRef.current?.scrollIntoView({ block: 'start', behavior: reducedMotion.current ? 'instant' : 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [recordOpen]);

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
    const measure = () => {
      setViewport({ x: track.scrollLeft, width: track.clientWidth });
      const center = track.scrollLeft + track.clientWidth / 2;
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
  }, [layout]);

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
    const slug = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-event]')?.dataset.event;
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

  return <div className="archive-app" style={{ '--era-accent': activeTheme.theme.accent } as CSSProperties}>
    <header className="site-header">
      <a className="brand" href={withBase('', base)} aria-label="The Known Galaxy archive home"><img src={withBase('images/branding/tkg-logo.png', base)} width="2299" height="894" alt="The Known Galaxy" /></a>
      <nav aria-label="Main navigation"><a href="#chronology" className="nav-active" aria-current="page">Timeline</a></nav>
      <div className="header-tools">
        <div className="search" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSearchOpen(false); }}>
          <Icon name="search" /><input ref={searchRef} aria-label="Search archive" role="combobox" aria-autocomplete="list" aria-controls="search-results" aria-expanded={searchOpen && Boolean(terms.length)} aria-activedescendant={searchIndex >= 0 && searchOpen ? `search-result-${searchIndex}` : undefined} placeholder="Search the archive" value={query} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); setSearchIndex(-1); }} onFocus={() => setSearchOpen(true)} onKeyDown={searchKey} /><kbd>/</kbd>
          {searchOpen && terms.length > 0 && <div className="search-popover"><p>{results.length ? 'Matching archive records' : 'No records found'}<span>Search includes people, places, and full lore.</span></p><ul id="search-results" role="listbox" aria-label="Archive search results">{results.map((event, index) => <li key={event.slug} id={`search-result-${index}`} role="option" aria-selected={index === searchIndex}><button ref={(element) => { resultRefs.current[index] = element; }} className={searchIndex === index ? 'search-active' : ''} onClick={() => selectEvent(event.slug)}><span className="event-date">{formatDate(event.year, event.calendar)}</span><strong>{event.title}</strong>{event.demo && <small>Demo · noncanonical</small>}</button></li>)}</ul>{count > 0 && <small className="search-filter-note">Selecting a hidden record clears conflicting filters.</small>}</div>}
        </div>
        <button ref={filtersButtonRef} className={`filters-button ${count ? 'has-filters' : ''}`} aria-haspopup="dialog" aria-expanded={filterOpen} onClick={() => setFilterOpen(true)}><Icon name="filter" /><span>Filters</span>{count > 0 && <span className="filter-count">{count}</span>}</button>
      </div>
    </header>
    <main id="main-content">
      <section id="chronology" className="chronology-section" aria-labelledby="chronology-title">
        <div className="chronology-heading"><div><p className="eyebrow">Through the eras</p><h1 id="chronology-title">The threads of history</h1></div><div className="timeline-legend"><span><i className="jedi-dot" />◇ Jedi</span><span><i className="sith-dot" />◆ Sith</span><span><i className="both-dot" />Both</span></div></div>
        <div className="era-navigation" aria-label="Jump to era" style={{ gridTemplateColumns: `repeat(${shownEras.length}, minmax(0, 1fr))` }}>{shownEras.map((era) => <button key={era.id} className={activeEra === era.id ? 'active-era' : ''} aria-current={activeEra === era.id ? 'true' : undefined} onClick={() => { const section = layout.sections.find((section) => section.id === era.id)!; moveTo(section.x + section.width / 2); }}><span>{era.name}</span><small>{formatDate(era.start.year, era.start.calendar)} — {era.end ? formatDate(era.end.year, era.end.calendar) : 'onward'}</small></button>)}</div>
        <div className="timeline-toolbar"><div><span className="era-indicator">{activeTheme.name}</span><span className="record-count" role="status">{visible.length} of {events.length} records</span></div><div className="timeline-controls"><button className="icon-button" aria-label="Previous timeline viewport" disabled={viewport.x < 1} onClick={() => trackRef.current?.scrollBy({ left: -viewport.width * .7, behavior: reducedMotion.current ? 'instant' : 'smooth' })}><Icon name="left" /></button><button className="icon-button" aria-label="Next timeline viewport" disabled={viewport.x >= maxScroll - 1} onClick={() => trackRef.current?.scrollBy({ left: viewport.width * .7, behavior: reducedMotion.current ? 'instant' : 'smooth' })}><Icon name="right" /></button></div></div>
        {count > 0 && <div className="active-filters">{filterGroups.flatMap((group) => filters[group.key].map((id) => <button key={`${group.key}-${id}`} onClick={() => setFilters({ ...filters, [group.key]: filters[group.key].filter((value) => value !== id) })} aria-label={`Remove ${group.options.find((option) => option.id === id)?.label} filter`}>{group.options.find((option) => option.id === id)?.label}<Icon name="close" /></button>))}<button className="clear-filters" onClick={() => setFilters(emptyFilters())}>Clear all</button></div>}
        <p id="timeline-help" className="sr-only">Scroll or drag horizontally to explore. On touch devices, swipe. Use Left and Right arrows, Home and End. Tab to an event and press Enter to open its record.</p>
        <div ref={trackRef} className="timeline-viewport" tabIndex={0} role="region" aria-label="Interactive lore timeline" aria-describedby="timeline-help" onKeyDown={timelineKey} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={() => { dragging.current = null; trackRef.current?.classList.remove('is-dragging'); }} onPointerLeave={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) dragging.current = null; }} onClickCapture={(event) => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}>
          <div className="timeline-track" style={{ width: layout.width }}>
            {shownEras.map((era) => <span key={era.id} className="timeline-atmosphere" aria-hidden="true" style={{ left: viewport.x, width: viewport.width, opacity: era.id === activeEra ? 1 : 0, background: `radial-gradient(ellipse at 55% 45%, rgba(${era.theme.atmosphere}, .23), transparent 80%)` }} />)}
            <div className="chronology-axis" aria-hidden="true" />
            {layout.sections.map((section) => { const era = eras.find((era) => era.id === section.id)!; return <div key={section.id} className="era-section" style={{ left: section.x, width: section.width, '--section-accent': era.theme.accent } as CSSProperties}><span className="era-boundary" aria-hidden="true" /><span className="era-watermark" aria-hidden="true">{era.name}</span>{!events.some((event) => event.era === era.id) && <span className="unrecorded-era">No approved records in this era yet.</span>}{section.ticks.map((tick) => <span className="chronology-tick" key={`${tick.year}-${tick.calendar}`} style={{ left: tick.x }}><i /><span>{formatDate(tick.year, tick.calendar)}</span></span>)}</div>; })}
            {layout.events.map(({ event, x, lane }) => visibleIds.has(event.slug) && <button key={event.slug} ref={(element) => { if (element) nodeRefs.current.set(event.slug, element); else nodeRefs.current.delete(event.slug); }} data-event={event.slug} title={event.title} className={`timeline-event lane-${lane} importance-${event.importance} faction-${event.factions.length > 1 ? 'both' : event.factions[0]} ${selectedSlug === event.slug ? 'selected' : ''} ${selected?.relatedEvents.includes(event.slug) ? 'related' : ''}`} style={{ left: x }} aria-pressed={selectedSlug === event.slug} aria-label={`${formatDate(event.year, event.calendar)}: ${event.title}${event.demo ? ', demo noncanonical record' : ''}`} onClick={() => selectEvent(event.slug)}><span className="event-node" aria-hidden="true" /><span className="event-card"><span className="event-card-top"><span className="event-date">{formatDate(event.year, event.calendar)}</span>{event.importance === 'major' && <span className="major-label">Major event</span>}</span>{event.image && event.importance === 'major' && <EventImage event={event} base={base} compact />}<span className="event-title">{event.title}</span>{event.importance === 'minor' && <FactionBadge factions={event.factions} />}{event.importance !== 'minor' && <span className="event-card-meta"><FactionBadge factions={event.factions} /><span className="type-label"><Icon name={event.types[0] ?? 'other'} />{event.types[0] ?? 'other'}</span></span>}{event.demo && <span className="demo-badge">Demo · noncanonical</span>}<span className="open-record">{selectedSlug === event.slug ? 'Record open' : 'Open record'}<Icon name="right" /></span></span></button>)}
          </div>
        </div>
        {!visible.length && <div className="timeline-empty" role="status">No records match these filters.<button className="text-button" onClick={() => setFilters(emptyFilters())}>Clear filters<Icon name="right" /></button></div>}
        <div className="overview"><div className="overview-track" aria-hidden="true">{layout.sections.map((section) => <span className="overview-era" key={section.id} style={{ left: `${section.x / layout.width * 100}%`, width: `${section.width / layout.width * 100}%` }} />)}{layout.events.filter(({ event }) => visibleIds.has(event.slug)).map(({ event, x }) => <i key={event.slug} className={`overview-node faction-${event.factions.length > 1 ? 'both' : event.factions[0]}`} style={{ left: `${x / layout.width * 100}%` }} />)}<span className="overview-window" style={{ left: `${viewport.x / layout.width * 100}%`, width: `${Math.min(100, viewport.width / layout.width * 100)}%` }} /></div><input type="range" min="0" max="1000" value={maxScroll ? Math.round(viewport.x / maxScroll * 1000) : 0} disabled={!maxScroll} aria-label="Timeline overview position" aria-valuetext={`${activeTheme.name}, ${Math.round(maxScroll ? viewport.x / maxScroll * 100 : 0)} percent through chronology`} onChange={(event) => { if (trackRef.current) trackRef.current.scrollLeft = Number(event.target.value) / 1000 * maxScroll; }} /></div>
        <div className="timeline-footnote"><span>Oldest<Icon name="right" />Newest</span><span className="desktop-help">Drag to explore · Scroll to travel · ← → to navigate</span><span className="mobile-help">Swipe to explore · Tap a record</span><span>BBD / ABD</span></div>
      </section>
      <p className={`archive-notice ${notice ? '' : 'sr-only'}`} role="status">{notice}</p>
      {selected && <div className="record-wrap" ref={recordRef}><EventDetail key={selected.slug} event={selected} events={events} base={base} onSelect={selectEvent} onClose={closeRecord} /></div>}
      <p className="sr-only" role="status">{selected ? `Selected record: ${formatDate(selected.year, selected.calendar)}, ${selected.title}` : ''}</p>
    </main>
    <footer className="site-footer"><span>The Known Galaxy <small>An evolving community lore archive.</small></span><p>An alternate Star Wars chronology for the Roblox community.<br />Unofficial fan project. Not affiliated with Lucasfilm or Disney.</p><div className="footer-actions"><a href="#chronology">Return to chronology ↑</a></div></footer>
    <FilterPanel open={filterOpen} onClose={() => { setFilterOpen(false); filtersButtonRef.current?.focus({ preventScroll: true }); }} filters={filters} onChange={setFilters} visible={visible.length} total={events.length} />
  </div>;
}
