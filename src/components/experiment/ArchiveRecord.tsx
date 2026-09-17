import { useState } from 'react';
import type { ExperimentalEvent, Perspective, PerspectiveAccounts } from '../../types/experiment';
import { experimentalEras as eras } from '../../data/experimental-eras';
import { formatPerspectiveDate } from '../../utils/lore-calendar';
import { resolveAccount } from '../../utils/perspective';
import { FactionIdentity } from './PerspectiveSelector';
import { RecordGallery } from './RecordGallery';
import { Icon } from '../ui/Icon';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function ArchiveRecord({ event, events, perspective, accounts, base, onSelect, onClose }: { event: ExperimentalEvent; events: ExperimentalEvent[]; perspective: Perspective; accounts: PerspectiveAccounts; base: string; onSelect: (slug: string) => void; onClose: () => void }) {
  const [copyState, setCopyState] = useState('Copy link');
  const formatDate = (year: number, calendar: 'BBD' | 'ABD') => formatPerspectiveDate(year, calendar, perspective);
  const account = resolveAccount(event, perspective, accounts);
  const era = eras.find(era => era.id === event.era);
  const related = events.filter(candidate => event.relatedEvents.includes(candidate.slug));
  const images = [...(event.image ? [{ image: event.image, alt: event.imageAlt ?? event.title }] : []), ...(event.gallery ?? [])];
  async function copyLink() { try { await navigator.clipboard.writeText(window.location.href); setCopyState('Link copied'); } catch { setCopyState('Copy the address bar URL'); } }
  return <section className={`archive-record ${images.length ? 'has-images' : 'text-record'}`} aria-labelledby="record-title">
    <div className="archive-record-bar"><span>Historical record{event.demo && <strong className="fixture-status"> · Demonstration only</strong>}</span><div><button className="text-button" onClick={copyLink}><Icon name="link" />{copyState}</button><button className="text-button" onClick={onClose}><Icon name="close" />Close record</button></div></div>
    <header className="archive-record-heading"><div className="record-date-row"><span className="record-date">{formatDate(event.year, event.calendar)}</span><FactionIdentity factions={event.factions} base={base} /></div><h2 id="record-title" tabIndex={-1}>{account.title}</h2><p className="account-status">{perspective === 'neutral' ? 'Canonical account' : account.fallback ? `Canonical account · a separate ${perspective === 'jedi' ? 'Jedi' : 'Sith'} account has not been supplied.` : `${perspective === 'jedi' ? 'Jedi' : 'Sith'} account`}</p></header>
    <div className="archive-record-composition">{images.length > 0 && <RecordGallery images={images} base={base} />}<div className="archive-record-narrative"><p className="record-summary">{account.summary}</p><div className="lore-body" dangerouslySetInnerHTML={{ __html: account.html }} />{account.terminology && <dl className="account-terminology">{Object.entries(account.terminology).map(([term, meaning]) => <div key={term}><dt>{term}</dt><dd>{meaning}</dd></div>)}</dl>}</div></div>
    <div className="archive-record-foot"><dl className="record-metadata"><div><dt>Era</dt><dd>{era?.name}</dd></div><div><dt>Classification</dt><dd>{event.types.map(capitalize).join(' · ') || 'Unclassified'}</dd></div><div><dt>Significance</dt><dd>{capitalize(event.importance)}</dd></div><div><dt>Locations</dt><dd>{event.locations.join(' · ') || 'Not recorded'}</dd></div>{event.characters.length > 0 && <div><dt>Characters</dt><dd>{event.characters.join(' · ')}</dd></div>}</dl>{related.length > 0 && <nav className="record-relations" aria-label="Related records"><h3>Related records</h3>{related.map(record => <button className="text-button" key={record.slug} onClick={() => onSelect(record.slug)}>{resolveAccount(record, perspective, accounts).title}<Icon name="right" /></button>)}</nav>}</div>
  </section>;
}
