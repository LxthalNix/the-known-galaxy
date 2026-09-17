/** Calendar epochs expressed on the single canonical (Dathomir-relative) year axis. */
export const loreCalendars = {
  dathomir: { origin: 0, before: 'BBD', after: 'ABD', event: 'purge-of-dathomir', name: 'Battle of Dathomir' },
  ossus: { origin: 16, before: 'BDO', after: 'ADO', event: 'destruction-of-ossus-library', name: 'Destruction of Ossus' },
} as const;
