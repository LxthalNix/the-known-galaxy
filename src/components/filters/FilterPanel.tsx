import { useEffect, useRef } from 'react';
import { eras } from '../../data/eras';
import { eventTypes } from '../../data/eventTypes';
import { Icon } from '../ui/Icon';

export interface Filters { era: string[]; faction: string[]; type: string[]; importance: string[] }
export interface FilterGroup { key: keyof Filters; label: string; options: { id: string; label: string }[] }
export const emptyFilters = (): Filters => ({ era: [], faction: [], type: [], importance: [] });
export const filterCount = (filters: Filters) => Object.values(filters).reduce((total, items) => total + items.length, 0);
export const filterGroups: FilterGroup[] = [
  { key: 'era' as const, label: 'Era', options: eras.map((era) => ({ id: era.id, label: era.name })) },
  { key: 'faction' as const, label: 'Faction', options: [{ id: 'jedi', label: 'Jedi' }, { id: 'sith', label: 'Sith' }, { id: 'both', label: 'Both factions' }] },
  { key: 'type' as const, label: 'Event type', options: eventTypes.map((type) => ({ id: type, label: type[0].toUpperCase() + type.slice(1) })) },
  { key: 'importance' as const, label: 'Significance', options: ['major', 'standard', 'minor'].map((id) => ({ id, label: id[0].toUpperCase() + id.slice(1) })) },
];

export function FilterPanel({ open, onClose, filters, onChange, visible, total, groups = filterGroups }: { open: boolean; onClose: () => void; filters: Filters; onChange: (filters: Filters) => void; visible: number; total: number; groups?: readonly FilterGroup[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open && !ref.current?.open) ref.current?.showModal(); else if (!open && ref.current?.open) ref.current?.close(); }, [open]);
  return <dialog ref={ref} className="filter-dialog" aria-labelledby="filter-title" onCancel={onClose} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <div className="filter-heading"><div><span className="eyebrow">Refine the archive</span><h2 id="filter-title">Filters</h2></div><button className="icon-button" aria-label="Close filters" onClick={onClose}><Icon name="close" /></button></div>
    <p className="filter-help">Combine categories to find a thread through history.</p>
    {groups.map((group) => <fieldset key={group.key}><legend>{group.label}</legend><div className="filter-options">{group.options.map((option) => <label key={option.id} className={`filter-option ${filters[group.key].includes(option.id) ? 'checked' : ''}`}><input type="checkbox" checked={filters[group.key].includes(option.id)} onChange={(event) => onChange({ ...filters, [group.key]: event.target.checked ? [...filters[group.key], option.id] : filters[group.key].filter((value) => value !== option.id) })} /><span>{option.label}</span></label>)}</div></fieldset>)}
    <div className="filter-footer"><button className="text-button" onClick={() => onChange(emptyFilters())}>Clear filters</button><button className="primary-button" onClick={onClose}>Show {visible} of {total} records<Icon name="right" /></button></div>
  </dialog>;
}
