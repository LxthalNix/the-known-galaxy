export const eras = [
  {
    id: 'unfamiliar-and-unknown',
    name: 'The Unfamiliar and Unknown',
    start: { year: 31, calendar: 'BBD' as const },
    end: { year: 20, calendar: 'BBD' as const },
    mood: 'Mysterious, incomplete archival history.',
  },
  {
    id: 'the-eminence',
    name: 'The Eminence',
    start: { year: 19, calendar: 'BBD' as const },
    end: { year: 1, calendar: 'BBD' as const },
    mood: 'Prestige, Dathomir and rising Sith power.',
  },
  {
    id: 'exodus-and-recovery',
    name: 'Exodus and Recovery',
    start: { year: 0, calendar: 'ABD' as const },
    end: { year: 16, calendar: 'ABD' as const },
    mood: 'Defeat, displacement, survival and rebuilding.',
  },
  {
    id: 'hallowed-preparations',
    name: 'Hallowed Preparations',
    start: { year: 17, calendar: 'ABD' as const },
    end: { year: 29, calendar: 'ABD' as const },
    mood: 'Preparation, retaliation and gathering strength.',
  },
  {
    id: 'era-of-expansion',
    name: 'Era of Expansion',
    start: { year: 30, calendar: 'ABD' as const },
    end: { year: 40, calendar: 'ABD' as const },
    mood: 'Reclamation, expansion and wider galactic activity.',
  },
  {
    id: 'to-be-determined',
    name: 'To Be Determined',
    start: { year: 41, calendar: 'ABD' as const },
    end: null,
    mood: 'Future chronology not yet written.',
  },
] as const;

export type EraId = (typeof eras)[number]['id'];
