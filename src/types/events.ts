import type { CollectionEntry } from 'astro:content';

/** Build-time content adapter; a future CMS can supply this same presentation shape. */
export type LoreEvent = CollectionEntry<'events'>['data'] & {
  html: string;
  searchText: string;
};
