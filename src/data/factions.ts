export const factions = {
  jedi: {
    id: 'jedi',
    name: 'Jedi',
    cssVar: '--jedi',
  },
  sith: {
    id: 'sith',
    name: 'Sith',
    cssVar: '--sith',
  },
} as const;

export type FactionId = keyof typeof factions;
