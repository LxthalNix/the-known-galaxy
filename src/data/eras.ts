export const eras = [
  {
    id: 'unfamiliar-and-unknown',
    name: 'The Unfamiliar and Unknown',
    start: { year: 31, calendar: 'BBD' as const },
    end: { year: 20, calendar: 'BBD' as const },
    mood: 'Mysterious, incomplete archival history.',
    theme: { accent: '#b5a4dc', atmosphere: '93, 65, 136', planet: '#211d32' },
  },
  {
    id: 'the-eminence',
    name: 'The Eminence',
    start: { year: 19, calendar: 'BBD' as const },
    end: { year: 1, calendar: 'BBD' as const },
    mood: 'Prestige, Dathomir and rising Sith power.',
    theme: { accent: '#d6938d', atmosphere: '137, 54, 55', planet: '#341e26' },
  },
  {
    id: 'exodus-and-recovery',
    name: 'Exodus and Recovery',
    start: { year: 0, calendar: 'ABD' as const },
    end: { year: 16, calendar: 'ABD' as const },
    mood: 'Defeat, displacement, survival and rebuilding.',
    theme: { accent: '#9ebdce', atmosphere: '62, 93, 124', planet: '#1b2934' },
  },
  {
    id: 'hallowed-preparations',
    name: 'Hallowed Preparations',
    start: { year: 17, calendar: 'ABD' as const },
    end: { year: 28, calendar: 'ABD' as const },
    mood: 'Preparation, retaliation and gathering strength.',
    theme: { accent: '#d5c299', atmosphere: '89, 106, 135', planet: '#2b3039' },
  },
  {
    id: 'era-of-expansion',
    name: 'Era of Expansion',
    start: { year: 29, calendar: 'ABD' as const },
    end: { year: 40, calendar: 'ABD' as const },
    mood: 'Reclamation, expansion and wider galactic activity.',
    theme: { accent: '#a4d3c9', atmosphere: '62, 115, 123', planet: '#203339' },
  },
  {
    id: 'to-be-determined',
    name: 'To Be Determined',
    start: { year: 41, calendar: 'ABD' as const },
    end: null,
    mood: 'Future chronology not yet written.',
    theme: { accent: '#9ba7b6', atmosphere: '69, 78, 97', planet: '#222832' },
  },
] as const;

export type EraId = (typeof eras)[number]['id'];
