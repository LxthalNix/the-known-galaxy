import { getCollection } from 'astro:content';
import { compareEvents } from './chronology';
import { safeLoreHtml } from './safe-html';
import { contentWithBase } from './paths';
import type { ExperimentalEvent, PerspectiveAccounts, GalleryImage } from '../types/experiment';
import { galleryThumbnail } from '../../scripts/gallery-assets.mjs';

// Build hooks generate derivatives before public assets are copied. Rendering only resolves paths.
export async function galleryThumbnails(images: GalleryImage[]): Promise<GalleryImage[]> {
  return Promise.all(images.map(image => galleryThumbnail(image)));
}
export async function experimentalContent(base: string) {
  const entries = await getCollection('events', ({data}) => !data.draft && !data.demo);
  const events: ExperimentalEvent[] = await Promise.all(entries.map(async entry => ({ ...entry.data, gallery: await galleryThumbnails(entry.data.gallery ?? []), html: contentWithBase(safeLoreHtml(entry.rendered?.html ?? ''), base), searchText: [entry.data.title, entry.data.summary, ...entry.data.characters, ...entry.data.locations, ...entry.data.types, entry.body ?? ''].join(' ').toLocaleLowerCase() })));
  events.sort(compareEvents);
  const slugs = new Set(events.map(e => e.slug));
  const seen = new Set<string>();
  const accounts: PerspectiveAccounts = (await getCollection('perspectives', ({data}) => !data.draft)).map(entry => {
    if (!slugs.has(entry.data.event)) throw new Error(`Perspective ${entry.id} references an unpublished or missing event: ${entry.data.event}`);
    const key = `${entry.data.event}.${entry.data.perspective}`;
    if (seen.has(key)) throw new Error(`Duplicate perspective account: ${key}`);
    seen.add(key);
    if (!entry.body?.trim()) throw new Error(`Perspective ${entry.id} needs a narrative body.`);
    return { ...entry.data, html: contentWithBase(safeLoreHtml(entry.rendered?.html ?? ''), base) };
  });
  return { events, accounts };
}
