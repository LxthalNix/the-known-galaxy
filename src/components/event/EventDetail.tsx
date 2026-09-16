import { useState } from 'react';
import type { LoreEvent } from '../../types/events';
import { eras } from '../../data/eras';
import { formatDate } from '../../utils/chronology';
import { withBase } from '../../utils/paths';
import { Icon } from '../ui/Icon';

export function FactionBadge({ factions }: { factions: LoreEvent['factions'] }) {
  return <span className={`faction-badge faction-${factions.length > 1 ? 'both' : factions[0]}`}><span className="faction-symbol" aria-hidden="true">{factions.length > 1 ? '◇ ◆' : factions[0] === 'jedi' ? '◇' : '◆'}</span>{factions.length > 1 ? 'Jedi & Sith' : factions[0] === 'jedi' ? 'Jedi' : 'Sith'}</span>;
}

export function EventImage({ event, base, compact = false }: { event: LoreEvent; base: string; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return <div className={`archive-image ${compact ? 'compact-image' : ''}`}>
    {event.image && !failed && <img src={withBase(event.image, base)} alt={event.imageAlt ?? ''} loading="lazy" style={{ opacity: loaded ? 1 : 0 }} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />}
    {(!event.image || failed || !loaded) && <>
      <div className="image-orbit" aria-hidden="true"><span /><span /><span /></div>
      {!compact && <div className="image-caption"><span className="eyebrow">Visual archive</span><p>Imagery pending</p><span>Approved game artwork will appear here.</span></div>}
    </>}
  </div>;
}

export function EventDetail({ event, events, base, onSelect, hidden }: { event?: LoreEvent; events: LoreEvent[]; base: string; onSelect: (slug: string) => void; hidden: boolean }) {
  const [copyState, setCopyState] = useState('Copy record link');
  const era = eras.find((era) => era.id === event?.era);
  const related = event ? events.filter((candidate) => event.relatedEvents.includes(candidate.slug)) : [];
  async function copyLink() {
    try {
      const recordUrl = new URL(window.location.href);
      recordUrl.hash = event!.slug;
      await navigator.clipboard.writeText(recordUrl.toString());
      setCopyState('Link copied');
    } catch { setCopyState('Copy the URL from your address bar'); }
  }
  if (!event) return <section className="record-empty" aria-labelledby="empty-record-title"><span className="eyebrow">Archive record</span><h2 id="empty-record-title">{hidden ? 'This record is hidden by your filters.' : 'Every history begins with a record.'}</h2><p>{hidden ? 'Select a visible event, or clear your filters to explore the full archive.' : 'Select an event on the chronology to open its lore, people, and places.'}</p></section>;
  return <section className="record" aria-labelledby="record-title">
    <div className="record-bar"><span className="eyebrow">Archive record <span className="record-id">/ {event.slug}</span></span><button className="text-button" onClick={copyLink}><Icon name="link" />{copyState}</button></div>
    <div className="record-layout">
      <EventImage key={event.slug} event={event} base={base} />
      <div className="record-content" key={event.slug}>
        <div className="record-date-row"><span className="record-date">{formatDate(event.year, event.calendar)}</span><FactionBadge factions={event.factions} />{event.demo && <span className="demo-badge">Demo · noncanonical</span>}</div>
        <h2 id="record-title">{event.title}</h2>
        <p className="record-summary">{event.summary}</p>
        <div className="lore-body" dangerouslySetInnerHTML={{ __html: event.html }} />
        <dl className="record-metadata">
          <div><dt>Era</dt><dd>{era?.name}</dd></div>
          <div><dt>Classification</dt><dd>{event.types.length ? event.types.map((type) => <span className="type-label" key={type}><Icon name={type} />{type}</span>) : 'Unclassified'}</dd></div>
          <div><dt>Significance</dt><dd className="capitalize">{event.importance}</dd></div>
          <div><dt>Locations</dt><dd>{event.locations.join(' · ') || 'Not recorded'}</dd></div>
          <div><dt>Characters</dt><dd>{event.characters.join(' · ') || 'Not recorded'}</dd></div>
        </dl>
        {related.length > 0 && <div className="related-events"><span className="eyebrow">Related records</span>{related.map((record) => <button className="text-button" key={record.slug} onClick={() => onSelect(record.slug)}>{record.title}<Icon name="right" /></button>)}</div>}
      </div>
    </div>
  </section>;
}
