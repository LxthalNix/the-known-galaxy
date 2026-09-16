import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { eras, type EraId } from './data/eras';
import { chronologyKey } from './utils/chronology';

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.object({
    title: z.string().trim().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase words separated by hyphens.'),
    year: z.number().int().nonnegative(),
    calendar: z.enum(['BBD', 'ABD']),
    timelineOrder: z.number().int().default(0),
    era: z.enum(eras.map((era) => era.id) as [EraId, ...EraId[]]),
    factions: z.array(z.enum(['jedi', 'sith'])).min(1),
    types: z.array(z.enum(['political', 'military', 'discovery', 'personal', 'other'])).default([]),
    importance: z.enum(['major', 'standard', 'minor']).default('standard'),
    summary: z.string().trim().min(1),
    image: z.string().regex(/^\/?images\/[a-zA-Z0-9_./-]+$/, 'Use a local images/ path.').optional(),
    imageAlt: z.string().optional(),
    locations: z.array(z.string()).default([]),
    characters: z.array(z.string()).default([]),
    relatedEvents: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    demo: z.boolean().default(false),
  }).superRefine((event, ctx) => {
    const era = eras.find((era) => era.id === event.era)!;
    const date = chronologyKey(event.year, event.calendar);
    if (event.calendar === 'BBD' && event.year === 0) {
      ctx.addIssue({ code: 'custom', path: ['calendar'], message: 'The origin is 0 ABD; 0 BBD is not valid.' });
    }
    if (date < chronologyKey(era.start.year, era.start.calendar) || (era.end && date > chronologyKey(era.end.year, era.end.calendar))) {
      ctx.addIssue({ code: 'custom', path: ['era'], message: 'The date must fall within the configured era.' });
    }
    if (event.image && (!event.imageAlt?.trim() || event.image.split('/').includes('..'))) {
      ctx.addIssue({ code: 'custom', path: ['image'], message: 'Images require descriptive imageAlt text and a path without parent-directory segments.' });
    }
    if (new Set(event.factions).size !== event.factions.length) {
      ctx.addIssue({ code: 'custom', path: ['factions'], message: 'List each faction only once.' });
    }
  }),
});

export const collections = { events };
