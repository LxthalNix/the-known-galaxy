import type { CSSProperties } from 'react';

const paths = {
  search: 'm21 21-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  filter: 'M4 7h16 M7 12h10 M10 17h4 M8 4v6 M16 9v6 M12 14v6',
  left: 'm14 6-6 6 6 6',
  right: 'm10 6 6 6-6 6',
  close: 'm6 6 12 12 M6 18 18 6',
  link: 'm10 13 4-4 M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0 M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0',
  military: 'm5 3 16 16 M19 3 3 19 M3 15l6 6 M15 3l6 6',
  political: 'm3 8 9-5 9 5 M4 9h16 M6 10v9 M12 10v9 M18 10v9 M3 21h18',
  discovery: 'm12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z',
  personal: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
  other: 'M4 4h16v16H4Z M8 8h8 M8 12h8 M8 16h5',
} as const;

export function Icon({ name, style }: { name: keyof typeof paths; style?: CSSProperties }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]} /></svg>;
}
