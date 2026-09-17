import type { Perspective } from '../../types/experiment';
import { withBase } from '../../utils/paths';

const perspectives = [{ id: 'jedi', name: 'Jedi', icon: 'jedi_icon.png' }, { id: 'neutral', name: 'Neutral', icon: 'jedi_sith.png' }, { id: 'sith', name: 'Sith', icon: 'sith_icon.png' }] as const;
export function Insignia({ kind, base }: { kind: Perspective; base: string }) {
  return <span className={`insignia insignia-${kind}`} aria-hidden="true"><img src={withBase(`images/factions/${perspectives.find(p => p.id === kind)!.icon}`, base)} alt="" /></span>;
}
export function FactionIdentity({ factions, base }: { factions: readonly string[]; base: string }) {
  const kind = factions.length > 1 ? 'neutral' : factions[0] === 'jedi' ? 'jedi' : 'sith';
  return <span className={`faction-identity identity-${kind}`}><Insignia kind={kind} base={base} />{factions.length > 1 ? 'Jedi & Sith' : kind === 'jedi' ? 'Jedi' : 'Sith'}</span>;
}
export function PerspectiveSelector({ value, onChange, base }: { value: Perspective; onChange: (perspective: Perspective) => void; base: string }) {
  return <div className="perspective-control"><div className="perspective-choices" role="group" aria-label="Historical perspective" aria-describedby="perspective-description">{perspectives.map(p => <div className="perspective-choice" key={p.id}><button type="button" aria-pressed={value === p.id} onClick={() => onChange(p.id)}><Insignia kind={p.id} base={base} /><span>{p.name}</span></button></div>)}</div></div>;
}
