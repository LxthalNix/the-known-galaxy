import { useState } from 'react';
import type { LoreEvent } from '../../types/events';
import { eras } from '../../data/eras';
import { formatDate } from '../../utils/chronology';
import { withBase } from '../../utils/paths';
import { Icon } from '../ui/Icon';

export function FactionBadge({ factions }: { factions: LoreEvent['factions'] }) {
  return <span className={`faction-badge faction-${factions.length > 1 ? 'both' : factions[0]}`}><span className="faction-symbol" aria-hidden="true">{factions.length > 1 ? '◇ ◆' : factions[0] === 'jedi' ? '◇' : '◆'}</span>{factions.length > 1 ? 'Jedi & Sith' : factions[0] === 'jedi' ? 'Jedi' : 'Sith'}</span>;
}

export function EventImage({ event, base, compact = false, onUnavailable }: { event: LoreEvent; base: string; compact?: boolean; onUnavailable?: () => void }) {
  const [failed, setFailed] = useState(false);
  if (!event.image || failed) return null;
  return <div className={`archive-image ${compact ? 'compact-image' : ''}`}>
    <img src={withBase(event.image, base)} alt={event.imageAlt ?? ''} loading="lazy" onError={() => { setFailed(true); onUnavailable?.(); }} />
  </div>;
}

export function EventDetail({ event, events, base, onSelect, onClose }: { event: LoreEvent; events: LoreEvent[]; base: string; onSelect: (slug: string) => void; onClose: () => void }) {
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const hasImage = Boolean(event.image) && !imageUnavailable;
  const [copyState, setCopyState] = useState('Copy record link');
  const era = eras.find((era) => era.id === event.era);
  const related = events.filter((candidate) => event.relatedEvents.includes(candidate.slug));
  async function copyLink() {
    try {
      const recordUrl = new URL(window.location.href);
      recordUrl.hash = event.slug;
      await navigator.clipboard.writeText(recordUrl.toString());
      setCopyState('Link copied');
    } catch { setCopyState('Copy the URL from your address bar'); }
  }
  return <section className="record" aria-labelledby="record-title">
    <div className="record-bar"><span className="eyebrow">Archive record <span className="record-id">/ {event.slug}</span></span><div className="record-actions"><button className="text-button" onClick={copyLink}><Icon name="link" />{copyState}</button><button className="text-button" onClick={onClose}><Icon name="close" />Close record</button></div></div>
    <div className={`record-layout ${hasImage ? '' : 'without-image'}`}>
      {hasImage && <EventImage key={event.slug} event={event} base={base} onUnavailable={() => setImageUnavailable(true)} />}
      <div className="record-content">
        <div className="record-date-row"><span className="record-date">{formatDate(event.year, event.calendar)}</span><FactionBadge factions={event.factions} />{event.demo && <span className="demo-badge">Demo · noncanonical</span>}</div>
        <h2 id="record-title" tabIndex={-1}>{event.title}</h2>
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
